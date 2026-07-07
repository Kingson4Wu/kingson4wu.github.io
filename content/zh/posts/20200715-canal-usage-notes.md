---
title: canal使用总结
date: '2020-07-15T15:07:33.000Z'
lang: zh
type: post
slug: '20200715'
tags:
  - Database
source:
  repo: zh
  path: source/_posts/20200715-canal使用总结.md
---
### 前言
本文只讲自己在使用canal之后的一些总结，关于canal的基础用法和介绍，不在这里赘述。

### 原理
+ canal的原理是基于mysql binlog技术，所以这里一定需要开启mysql的binlog写入功能，建议配置binlog模式为row
+ 原文：https://blog.csdn.net/liupeifeng3514/article/details/79687130 
+ mysql的自带复制技术可分成三步：
	1. master将改变记录到二进制日志(binary log)中（这些记录叫做二进制日志事件，binary log events，可以通过show binlog events进行查看）；
	2. slave将master的binary log events拷贝到它的中继日志(relay log)，这里是I/O thread线程；
	3. slave重做中继日志中的事件，将改变反映它自己的数据，这里是SQL thread线程。

+ 基于canal&otter的复制技术和mysql复制类似，具有类比性：
	1. Canal对应于I/O thread，接收Master Binary Log；
	2. Otter对应于SQL thread，通过Canal获取Binary Log数据，执行同步插入数据库；
+ 两者的区别在于：
	1. otter目前嵌入式依赖canal，部署为同一个jvm，目前设计为不产生Relay Log，数据不落地；
	2. otter目前允许自定义同步逻辑，解决各类需求； 
    a. ETL转化. 比如Slave上目标表的表名，字段名，字段类型不同，字段个数不同等. 
    b. 异构数据库. 比如Slave可以是oracle或者其他类型的存储,nosql等. 
    c. M-M部署，解决数据一致性问题 
    d. 基于manager部署，方便监控同步状态和管理同步任务.
+ canal的工作原理：
	- canal模拟mysql slave的交互协议，伪装自己为mysql slave，向mysql master发送dump协议
	- mysql master收到dump请求，开始推送binary log给slave(也就是canal)
	- canal解析binary log对象(原始为byte流)    
    

### 使用简述
1. 对MySQL给canal-server授权
	- `CREATE USER 'canal_server' IDENTIFIED BY 'canal_server';`
	- `GRANT SELECT, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'canal_server';`
2. canal使用ZK来做HA，因为涉及多个client时，消费计算的业务较为复杂的问题，所以目前在使用上只是单点部署，基本能满足需求。


### 使用总结
1. 可以通过指定binlog文件和position来重放binlog数据：
2. 如何查看MySQL位点：https://blog.csdn.net/c1052981766/article/details/80604083
    - `show master status`
    - `show binary logs`
    - `show binlog events in 'binlog.000368' limit 10;` //pos 就是位点, 重启 canal
    - 如何查到旧记录的位点？
		1. 由canal-server中meta.dat记录
		2. 通过 mysqlbinlog 命令分析 mysql-bin.xxx 文件内容，确定增量恢复到的时间点（运维协助）。
3. 除了用pos点的办法进行恢复，也可以通过指定时间区间进行恢复，按时间恢复需要用mysqlbinlog命令读取binlog日志内容，找时间节点。
    - [使用mysqlbinlog工具进行基于位置或时间点的数据恢复](https://blog.csdn.net/zyz511919766/article/details/38089393)
4. 重跑。修改instance.properties文件设置重跑起始位点，删除meta.dat文件并重启。注意回放数据时视业务情况，可能要忽略第一个位点对应的数据。
5. 重启之后batchId会变，所以不能使用batchId来做幂等处理
6. 使用mysql主从同步和使用canal同步的区别? 同步数据为什么不直接用主从同步机制？
	1. mysql版本不一致，不支持主从同步
	2. 并不是自己的库，只需要同步几张表，运维不会做这种定制化
	3. 完成同步目标后，可方便拆卸和控制
7. client重启如何对应原来的位点
	- canal client和server交互之间的身份标识，目前clientId写死为1001. (目前canal server上的一个instance只能有一个client消费，clientId的设计是为1个instance多client消费模式而预留的，暂时不需要理会)

### canal和MySQL相关资料

1. 下载：<https://github.com/alibaba/canal/releases/download/canal-1.1.4/canal.deployer-1.1.4.tar.gz>
2. `canal.instance.gtidon`   是否启用mysql gtid的订阅模式 
   - [Mysql GTID 模式详解](https://blog.csdn.net/wmq880204/article/details/53160078)
3. https://github.com/alibaba/canal/wiki/QuickStart
https://github.com/alibaba/canal/wiki/AdminGuide
https://github.com/alibaba/canal/wiki/ClientExample
4. [MySQL数据库的授权原则](https://www.cnblogs.com/sunss/archive/2010/10/05/1844204.html)
5. [canal 高可用介绍](https://www.jianshu.com/p/0f580647905c)
6. [canal和otter的高可靠性分析](https://www.cnblogs.com/f-zhao/p/7681960.html)

