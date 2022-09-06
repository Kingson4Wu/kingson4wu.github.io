---
title: 有了TCP的keepalive，应用层还需要实现保活逻辑吗？
date: 2022-09-06 22:02:39
tags: [TCP, keepalive]
---


## 结论
+ 对于实时性高的业务，基本都需要在应用层自行实现保活逻辑，应用层的心跳协议是必不可少的

## TCP keepalive 的 问题
1. 检测周期长，开启后默认是2h（系统内核参数 tcp_keepalive_time），这就意味着服务端可能维持着一个死连接；
2. TCP keepalive 是由操作系统负责探查，即便进程死锁，或阻塞等，操作系统也会收发 TCP keepalive 消息，无法及时感知客户端已经实际已经下线；

## 应用层实现心跳的基本做法
1. 服务端和客户端都开启tcp keepalive
2. 客户端定时发心跳包到服务端
3. 服务端根据自定义的规则，在一定时间内收不到心跳包的时，断开客户端的连接。 

## 应用层实现心跳保活逻辑的好处
1. 可以在发送心跳包的同时顺带业务或指令数据，这样服务端获得客户端的详细状态，同时可以更好满足业务场景
2. 可以灵活控制探查客户端的时间和策略，更快下线有异常的连接，减少服务端不必要的负担


## Reference
+ [在以TCP为连接方式的服务器中，为什么在服务端设计当中需要考虑心跳？](<http://www.zhihu.com/question/35013918>)
+ [闲说HeartBeat心跳包和TCP协议的KeepAlive机制](https://www.felix021.com/blog/read.php?2076)
+ [TCP协议的KeepAlive机制与HeartBeat心跳包](http://www.nowamagic.net/academy/detail/23350382)