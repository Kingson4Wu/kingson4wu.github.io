---
title: 使用ThreadContext缓存RPC结果
date: 2020-07-06 19:44:20
tags: [业务方案,ThreadContext,RPC]
keywords: [ThreadContext, RPC缓存, Java, 性能优化, 微服务]
description: 详细介绍如何使用ThreadContext缓存RPC结果以避免重复调用，提高系统性能，包含实际业务场景和解决方案分析。
---

![](photo/Gerrard.jpeg)

在业务开发中，经常会使用RPC请求获取数据。有时候在同一条逻辑链路中，会多次使用RPC返回的数据。

### 业务场景

<pre>
请求----------> 服务A
             [1.methodA]----获取用户数据--->服务B(用户服务)
             [2.mehtodB]----获取用户数据--->服务B(用户服务)
</pre>
上图中，服务A中同一个逻辑链路中包含methodA和mehtodB，两个都会使用到用户数据，因此会导致重复的RPC调用。

### 解决方案
1. 将数据实体作为methodB的参数传入
	- 这种方式可以避免调用多次重复的RPC，但是也有缺点：
		a. 如果有mehtodC，methodD等，每个方法都加个参数，不是很优雅
		b. 如果除了获取用户信息，还要获取商品信息等，那么方法形参将越来越多，影响阅读
<pre>
请求----------> 服务A
             [1.methodA]----获取用户数据--->服务B(用户服务)
             [2.mehtodB(param1: userInfo)]----获取用户数据--->服务B(用户服务)
             [3.mehtodC(param1: userInfo)]----获取用户数据--->服务B(用户服务)
</pre>		
2. 使用	ThreadContext 缓存RPC结果
	- 可以使用拦截器统一处理服务的所有ThreadContext(因为使用完之后需要remove)
	- 将RPC结果保存到ThreadContext和从ThreadContext获取RPC结果的逻辑，封装在RPC调用方法中
<pre>
请求----------> 服务A
             [1.methodA]----获取用户数据--->服务B(用户服务)
             ->> 将RPC结果保存在ThreadContext
             [2.mehtodB]----获取用户数据--->从ThreadContext获取
             [3.mehtodC]----获取用户数据--->从ThreadContext获取
</pre>	
		


