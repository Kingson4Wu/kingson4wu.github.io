---
title: 记一次socket泄露问题排查记录
date: '2023-07-30T05:03:45.000Z'
lang: zh
type: post
slug: 20230730-2
tags:
  - Reliability
  - Networking
  - TCP
source:
  repo: zh
  path: source/_posts/20230730-记一次socket泄露问题排查记录.md
---
## 结论先行

这次排查确认了两个现象：Go 服务的 goroutine 卡在锁等待中，大量请求无法返回；同一时期，进程持有的文件描述符和 `CLOSE_WAIT` 连接明显增加。后文代码显示一个可能造成死锁的 `RWMutex` 使用问题；但“死锁如何进一步导致部分 socket 未及时释放”的具体路径，当时没有完整证据，不能把它写成已验证的唯一根因。

### 具体过程
+ `pprof` 中出现大量锁等待的 goroutine，请求持续挂起
+ Nginx 超时关闭连接后，服务端可观察到较多 `CLOSE_WAIT`
+ 重启服务后连接数量下降；连接未及时释放的具体代码路径尚未定位


---

## 前置知识

### TCP状态图
+ 从网上找的

<figure>
  <img src="/assets/zh/posts/20230730-2/TCP%E7%8A%B6%E6%80%81%E5%9B%BE.jpg" alt="TCP状态图">
  <figcaption>图：TCP状态图</figcaption>
</figure>

### 相关排查命令

<pre>
sudo lsof | grep sock | awk '{++S[$1]} END {for(a in S) print a, S[a]}' | sort -nr
sudo lsof | awk '/sock/ {++S[substr($0, index($0, $9))]} END {for(a in S) print a, S[a]}'
sudo lsof | grep sock|grep 'identify protocol'|awk ' {++S[$2]} END {for(a in S) print a, S[a]}'| sort -nr
//打开句柄数目最多的进程
lsof -n|awk '{print $2}'| sort | uniq -c | sort -nr | head
//查看close_wait连接统计：
sudo netstat -anp|grep 'CLOSE_WAIT'|grep 'ssogo'| awk '{print $5}'|sort |uniq -c | sort -nr
//查看FIN_WAIT2连接统计：
sudo netstat -anp|grep 'FIN_WAIT2'|grep 'ssogo'| awk '{print $5}'|sort |uniq -c | sort -nr
//查看CLOSE_WAIT最多的进程
sudo netstat -anp|grep 'CLOSE_WAIT'| awk '{print $7}'|sort |uniq -c | sort -nr
sudo netstat -anp|grep 'FIN_WAIT2'| awk '{print $7}'|sort |uniq -c | sort -nr
</pre>

### ss 
`ss -s` 展示套接字统计摘要，其中的 `closed` 计数不能单独证明某个进程泄漏了文件描述符。判断是否泄漏，需要结合进程的 FD 数、`lsof` 输出、连接状态随时间的变化以及重启前后的对比。[`ss` 手册](https://man7.org/linux/man-pages/man8/ss.8.html)也说明，摘要统计并不是通过逐条解析套接字列表得到的。

## lsof
+ `lsof| grep "can't identify protocol"`
如果这类记录持续增加，应结合进程 FD 数和连接状态继续排查；仅凭 `can't identify protocol` 字样不能断定 socket 泄漏。

---

## 处理过程1

<figure>
  <img src="/assets/zh/posts/20230730-2/socket%E6%95%B0%E9%87%8F%E6%9A%B4%E6%B6%A8.png" alt="socket数量暴涨">
  <figcaption>图：socket数量暴涨</figcaption>
</figure>

+ 紧急重启服务（业务Go服务）后socket数量下降

+ 在现场已经没了的情况下，分析发现机器上本身已经存在大量socket泄漏的情况

<figure>
  <img src="/assets/zh/posts/20230730-2/identify%20protocol.png" alt="identify protocol">
  <figcaption>图：identify protocol</figcaption>
</figure>

<figure>
  <img src="/assets/zh/posts/20230730-2/process.png" alt="process">
  <figcaption>图：process</figcaption>
</figure>

<figure>
  <img src="/assets/zh/posts/20230730-2/process2.png" alt="process2">
  <figcaption>图：process2</figcaption>
</figure>

+ nginx和gateway都reload，那么nginx会产生新的worker进程，但是应该shutdown的老进程因为和gateway还有连接，所以也不会销毁，这样时间长了会有很多处于shutting状态的进程，这些进程都会占用资源。

+ 初步怀疑是这些异常的nginx worker进程导致的，于是处理所有机器上这些异常（kill）
    1. 如果清掉这些异常进程后，问题不再发生，那么很大可能就是这个原因导致的
    2. 如果问题还继续发生，说明是其他的原因

---

## 处理过程2
+ 即使上次清理了所有有问题的nginx worker进程，释放了大量泄漏的socket，相同的问题后续还是发生了

<figure>
  <img src="/assets/zh/posts/20230730-2/%E8%BF%87%E7%A8%8B2-1.png" alt="过程2 1">
  <figcaption>图：过程2 1</figcaption>
</figure>

+ 还是出现了大量的closed状态，已经大量的close_wait和fin_wait2状态

+ 通过lsof查看，确实是Go业务进程泄漏的socket

<figure>
  <img src="/assets/zh/posts/20230730-2/%E8%BF%87%E7%A8%8B2-3.png" alt="过程2 3">
  <figcaption>图：过程2 3</figcaption>
</figure>

+ 上图的正常状态下，close_wait和fin_wait2状态的数量，并没那么多

+ 后续可持续统计以下状态，确认数量变化与具体进程的对应关系：

<pre>
//查看close_wait连接统计：
sudo netstat -anp|grep 'CLOSE_WAIT'|grep 'ssogo'| awk '{print $5}'|sort |uniq -c | sort -nr
//查看FIN_WAIT2连接统计：
sudo netstat -anp|grep 'FIN_WAIT2'|grep 'ssogo'| awk '{print $5}'|sort |uniq -c | sort -nr
//查看CLOSE_WAIT最多的进程
sudo netstat -anp|grep 'CLOSE_WAIT'| awk '{print $7}'|sort |uniq -c | sort -nr
sudo netstat -anp|grep 'FIN_WAIT2'| awk '{print $7}'|sort |uniq -c | sort -nr
</pre>

+ 通过pprof输出进程的goroutine情况，从数量和堆栈分析，大量goroutine锁住，导致请求被hang住 

+ 至此，问题的基本表现分析如下
    1. Go进程出问题hang住大量请求
    2. 上层的nginx超时主动关闭连接，状态变成FIN_WAIT2，而Go进程对应的socket拦截则变成CLOSE_WAIT
        - 查看设置为 proxy_read_timeout 10（即10s）：proxy_read_timeout 是用来设置与后端代理服务器之间的读取超时时间，它控制 Nginx 从后端代理服务器读取响应的最长等待时间。当从后端服务器读取响应数据的时间超过了设置的超时时间，Nginx 将认为后端服务器的响应已经超时，并且会中断与后端服务器的连接。
    3. Go 进程仍持有大量连接相关的 FD；这些 FD 为什么没有及时释放，还需要进一步追踪关闭路径，不能只根据 `lsof` 的显示文字判断原因

### 扩展

#### can't identify protocol 是怎么出现的？
+ https://idea.popcount.org/2012-12-09-lsof-cant-identify-protocol/

```python
import socket
import os
import sys

PORT = 9918

sd = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sd.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sd.bind(('0.0.0.0', PORT))
sd.listen(5)

for i in range(10):
    if os.fork() == 0:
        sd.close()
        cd = socket.socket(socket.AF_INET,
                           socket.SOCK_STREAM)
        cd.connect(('127.0.0.1', PORT))
        sys.exit()

print "Server process pid=%i" % (os.getpid(),)
sockets = []
for i in range(10):
    (cd, address) = sd.accept()
    sockets.append(cd)
    cd.shutdown(socket.SHUT_WR)

os.system("lsof -p %i" % (os.getpid(),))
```   

+ 这个示例能帮助观察 `lsof` 输出，但不能直接证明本次 Go 服务出现相同原因；两者仍需通过进程状态和 FD 生命周期对应起来。

#### 为什么lsof和ss的执行结果不同
+ `ss` 与 `lsof` 的数据来源和展示方式不同，摘要计数不能与某一条 `lsof` 记录直接一一对应。

#### 通过模拟client断开，server端hang住
+ 在本地 HTTP 测试服务写响应前加入 `sleep(600);`，让连接保持打开。
+ 用 `curl --connect-timeout 10 -m 20 "http://127.0.0.1:1666/"` 请求该服务；其中 `1666` 是测试服务监听的端口，按实际配置调整。
+ 执行lsof 只出现了‘CLOSE_WAIT’,没有出现 can't identity protocol

#### 尚未完成的验证

当时没有进一步定位 Go 服务关闭连接的完整调用路径，也没有确认 Gin 层的连接限制是否相关。这些问题留作后续排查，不能作为本次事故的既定结论。


---

## 处理过程3
+ 分析Go进程死锁原因

+ 通过分析pprof的goroutine堆栈

```go
type GuardPolicy struct {
	mu      *sync.RWMutex
	errData map[*sql.DB]int
}

type sortPool struct {
	connPool gorm.ConnPool
	errCnt   int
}

func (s *GuardPolicy) countErr(db *gorm.DB) {
	if db.Error == nil || errors.Is(db.Error, gorm.ErrRecordNotFound) {
		return
	}
	if ins, ok := db.Statement.ConnPool.(*sql.DB); ok {
		s.mu.Lock()
		defer s.mu.Unlock()
		s.errData[ins] = s.errData[ins] + 1
	}
}

func (s *GuardPolicy) Resolve(connPools []gorm.ConnPool) gorm.ConnPool {
	var x = make([]*sortPool, 0, len(connPools))
	for i := range connPools {
		p, ok := connPools[i].(*sql.DB)
		if !ok {
			x = append(x, &sortPool{connPool: connPools[i], errCnt: 0})
		} else {
			s.mu.RLock()
			defer s.mu.RUnlock()
			x = append(x, &sortPool{connPool: connPools[i], errCnt: s.errData[p]})
		}
	}
	sort.Slice(x, func(i, j int) bool {
		return x[i].errCnt <= x[j].errCnt
	})
	return x[0].connPool
}
```

（1） goroutine1: s.mu.RLock()
（2） goroutine2: s.mu.Lock() - 等待（1）
（3） goroutine1: s.mu.RLock() - 等待（2）
相当于goroutine1自己等待自己



问题出在 `Resolve()` 的循环里：每次进入 `else` 都获取读锁，却用 `defer s.mu.RUnlock()` 延迟到函数返回时释放。若已有读锁尚未释放，另一个 goroutine 开始等待写锁，后续循环再调用 `RLock()` 就会被等待中的写锁挡住；当前函数又要等这次 `RLock()` 返回才能执行之前的 `defer`，形成死锁。Go 的 [`sync.RWMutex` 文档](https://pkg.go.dev/sync#RWMutex)明确说明不能递归获取读锁。

修复方式是每次读取 `errData` 后立即释放读锁，不要把解锁放到循环结束之后：

```go
func (s *GuardPolicy) Resolve(connPools []gorm.ConnPool) gorm.ConnPool {
    x := make([]*sortPool, 0, len(connPools))
    for _, pool := range connPools {
        db, ok := pool.(*sql.DB)
        if !ok {
            x = append(x, &sortPool{connPool: pool})
            continue
        }
        s.mu.RLock()
        errCnt := s.errData[db]
        s.mu.RUnlock()
        x = append(x, &sortPool{connPool: pool, errCnt: errCnt})
    }
    sort.Slice(x, func(i, j int) bool { return x[i].errCnt < x[j].errCnt })
    return x[0].connPool
}
```

这里仅展示锁的改动；生产代码仍需处理 `connPools` 为空等边界。原示例中的 `sort.Slice` 比较器使用 `<=`，也应改为严格的 `<`，但它与这次锁等待是两个独立问题。死锁原因有代码依据；连接为何长期占用，仍应单独用 FD 与连接关闭路径验证。

## 扩展
+ 跟这个很像：[线上一次大量 CLOSE_WAIT 复盘](https://ms2008.github.io/2019/07/04/golang-redis-deadlock/)

---

## Reference
+ [tcp socket文件句柄泄漏](https://blog.csdn.net/wodatoucai/article/details/69389288)
+ [确认是否有socket泄露](https://www.cnblogs.com/rootq/articles/1403720.html)
+ [记一次排查socket fd泄漏](https://zzyongx.github.io/blogs/socket_fd_leak.html)
+ [又一次排查socket fd泄漏](https://zzyongx.github.io/blogs/socket_fd_leak_2.html)
+ [socket句柄泄漏问题的定位： losf和strace的联合使用](https://blog.csdn.net/stpeace/article/details/57103089)
