# 业务开发中使用BI的海量数据处理能力

Canonical: https://kingson4wu.github.io/zh/posts/20240425/
Markdown: https://kingson4wu.github.io/zh/posts/20240425/index.md
Language: zh
Type: post
Date: 2024-04-25
Tags: Architecture

BI的数据统计跑数结果一般是T+1生成的 实时性要求不高的功能，用于推荐等其他业务功能，可用于统计和监控等 对实时性要求高的功能，做后置的监控，及早发现逻辑错误

---

+ BI的数据统计跑数结果一般是T+1生成的

1. 实时性要求不高的功能，用于推荐等其他业务功能，可用于统计和监控等
2. 对实时性要求高的功能，做后置的监控，及早发现逻辑错误
