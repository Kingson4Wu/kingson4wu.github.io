---
title: 你记得设置TCP_NODEPLAY吗？
date: 2022-09-07 13:26:22
tags: [TCP, TCP_NODELAY]
---

+ 有接触过TCP服务器实现的同学都会知道，需要注意TCP_NODELAY参数，为什么呢？

+ 若没有开启TCP_NODELAY，那么在发送小包的时候，可能会出现这样的现象：
通过 TCP socket 分多次发送较少的数据时，比如小于 1460 或者 100 以内，对端可能会很长时间收不到数据，导致本端应用程序认为超时报错。


## Nagle算法（Nagle‘s Algorithm）
+ TCP/IP协议中，无论发送多少数据，总是要在数据前面加上协议头，同时，对方接收到数据，也需要发送ACK表示确认。为了尽可能的利用网络带宽，TCP总是希望尽可能的发送足够大的数据。（一个连接会设置MSS参数，因此，TCP/IP希望每次都能够以MSS尺寸的数据块来发送数据）。
+ Nagle算法就是为了尽可能发送大块数据，避免网络中充斥着许多小数据块。
+ Nagle算法的基本定义是任意时刻，最多只能有一个未被确认的小段。 所谓“小段”，指的是小于MSS尺寸的数据块，所谓“未被确认”，是指一个数据块发送出去后，没有收到对方发送的ACK确认该数据已收到。
+ 举个例子，一开始client端调用socket的write操作将一个int型数据(称为A块)写入到网络中，由于此时连接是空闲的（也就是说还没有未被确认的小段），因此这个int型数据会被马上发送到server端，接着，client端又调用write操作写入一个int型数据（简称B块），这个时候，A块的ACK没有返回，所以可以认为已经存在了一个未被确认的小段，所以B块没有立即被发送，一直等待A块的ACK收到（大概40ms之后）(ACK延迟机制的超时时间)，B块才被发送。

+ Nagle算法的改进在于：如果发送端欲多次发送包含少量字符的数据包（一般情况下，后面统一称长度小于MSS的数据包为小包，与此相对，称长度等于MSS的数据包为大包，为了某些对比说明，还有中包，即长度比小包长，但又不足一个MSS的包），则发送端会先将第一个小包发送出去，而将后面到达的少量字符数据都缓存起来而不立即发送，直到收到接收端对前一个数据包报文段的ACK确认、或当前字符属于紧急数据，或者积攒到了一定数量的数据（比如缓存的字符数据已经达到数据包报文段的最大长度）等多种情况才将其组成一个较大的数据包发送出去。
 TCP在三次握手建立连接过程中，会在SYN报文中使用MSS（Maximum Segment Size）选项功能，协商交互双方能够接收的最大段长MSS值。

 ## ACK延迟机制(TCP Delayed Acknoledgement) 
 + TCP/IP中不仅仅有Nagle算法(Nagle‘s Algorithm)，还有一个ACK延迟机制(TCP Delayed Ack) 。当Server端收到数据之后，它并不会马上向client端发送ACK，而是会将ACK的发送延迟一段时间（假设为t），它希望在t时间内server端会向client端发送应答数据，这样ACK就能够和应答数据一起发送，就像是应答数据捎带着ACK过去。
 + 也就是如果一个 TCP 连接的一端启用了Nagle算法，而另一端启用了ACK延时机制，而发送的数据包又比较小，则可能会出现这样的情况：发送端在等待接收端对上一个packet的Ack才发送当前的packet，而接收端则正好延迟了此Ack的发送，那么这个正要被发送的packet就会同样被延迟。当然Delayed Ack是有个超时机制的，而默认的超时正好就是40ms。
 + 现代的 TCP/IP 协议栈实现，默认几乎都启用了这两个功能，那岂不每次都会触发这个延迟问题？事实不是那样的。仅当协议的交互是发送端连续发送两个packet，然后立刻read的时候才会出现问题。


## 总结：问题出现的三个条件
  1. 发送小包（仅当协议的交互是发送端连续发送两个 packet，然后立刻 read 的 时候才会出现问题。）
  2. 发送方启用了Nagle算法（发送方未接收到上一个包的ack，且待发送的是小包，则会等待）
  3. 接收方启用了ACK延时机制 且没及时准备好数据（希望响应ack可以和响应的数据一起发送，等待本端响应数据的准备）


## 解决办法
+ 开启TCP_NODELAY：禁用Nagle算法，禁止后当然就不会有它引起的一系列问题了。
+ 优化协议：连续 write 小数据包，然后 read 其实是一个不好的网络编程模式，这样的连续 write 其实应该在应用层合并成一次 write。


## 扩展

### 另一个问题的例子(HTTP服务)
+ [神秘的40毫秒延迟与TCP_NODELAY](https://cloud.tencent.com/developer/article/1621142)
+ 接口响应时间在client端开启keepalive后连续请求时由0ms变成40ms

+ 因为设计的一些不足，我没能做到把 短小的 HTTP Body 连同 HTTP Headers 一起发送出去，而是分开成两次调用实 现的，之后进入 epoll_wait 等待下一个 Request 被发送过来（相当于阻塞模 型里直接 read）。正好是 write-write-read 的模式
+ 那么 write-read-write-read 会不会出问题呢？维基百科上的解释是不会：
    - “The user-level solution is to avoid write-write-read sequences on sockets. write-read-write-read is fine. write-write-write is fine. But write-write-read is a killer. So, if you can, buffer up your little writes to TCP and send them all at once. Using the standard UNIX I/O package and flushing write before each read usually works.”
    - 我的理解是这样的：因为第一个 write 不会被缓冲，会立刻到达接收端，如果是 write-read-write-read 模式，此时接收端应该已经得到所有需要的数据以进行 下一步处理。接收端此时处理完后发送结果，同时也就可以把上一个packet 的 Ack 可以和数据一起发送回去，不需要 delay，从而不会导致任何问题。

## Reference
+ [TCP_NODELAY和Nagle算法](https://blog.csdn.net/majianfei1023/article/details/51558941)




