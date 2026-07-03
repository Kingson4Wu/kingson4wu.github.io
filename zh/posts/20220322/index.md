# 轻量级微服务公共库设计

Canonical: https://kingson4wu.github.io/zh/posts/20220322/
Markdown: https://kingson4wu.github.io/zh/posts/20220322/index.md
Language: zh
Type: post
Date: 2022-03-22
Tags: Architecture

目的 减少拷贝代码，抽象公共业务组件和复用，快速支持产品需求 提升开发效率，增强排查能力 统一维护，提升代码质量，减少重复错误，提高服务可控性 公共嵌入式的sdk，其实有点类似一个轻量级的网关，sidecar，localproxy 为什么不使用API网关？ 有一定的机器和维护成本 跟组织架构有一定关系 启发式实现样例

---

## 目的
+ 减少拷贝代码，抽象公共业务组件和复用，快速支持产品需求
+ 提升开发效率，增强排查能力
+ 统一维护，提升代码质量，减少重复错误，提高服务可控性

+ 公共嵌入式的sdk，其实有点类似一个轻量级的网关，sidecar，localproxy

![](/assets/zh/posts/20220322/common.png)

+ 为什么不使用API网关？
	1. 有一定的机器和维护成本
	2. 跟组织架构有一定关系

+ [启发式实现样例](https://github.com/Kingson4Wu/embedded_light_gateway)
