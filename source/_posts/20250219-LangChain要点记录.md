---
title: LangChain要点记录
date: 2025-02-19 20:53:32
tags: [AI, LangChain, LLM]
---

>> 基于书籍简单记录要点

![](20250219-LangChain要点记录/LangChain.png)


# LangChain 提供了多种模板供选择

+ LangChain 提供了以下格式化 SQL 提示词模板（翻译）：

<pre>
1. 你是一个 PostgreSQL 专家。给定一个输人问题，首先创建一个语法正确的 PostgreSQL查询来运行，然后查看查询结果，扑返回针对输人问题的答案。
2. 除非用户明确指定了要返回的结果数量，否则应使用 PostgreSQL 的LIMIT 子句来限制查询结果，最多返回top.k条记录。你可以对结果进行排序，以返回数据库中最有信息价值的数据。
3. 绝对不要查询表中的所有列。你只能在询回答问题所需的列。用双引号（"）将每个列名包裹起来，表示官们是界定的标识符。
4. 注意只使用你在表巾可以看到的列名，不要责询不存在的列。此外，要注意哪一列在哪个表中。
5. 如果问题涉及“今天”，请注意使用 CURRENT_DATE 函数获取当前日期。

使用以下格式：

问题：这里的问题
SQL查询：要运行的 SQL 查询
SQL结果：SQL 查询的结果
答案：这里的最终答案

只使用以下表：

(table_info)

问题：｛input｝

</pre>

+ 想象一下，如果没有 LangChain 提供的这个提示词模板，当你要开始编写一段SQL查询代码时，会走多少弯路？LLM 应用开发的最后1公里，其意义是确保开发者无须为了一个小细节而多走弯路，正如居民无须跑很远坐公交车一样，每一个关键的细节都能得到及时而准确的处理，使得整个开发过程更为高效。

# 记忆提示词
+ 创建提示词是最重要的环节。在创建的过程中你可以理解为什么加人记忆组件后，“聊天备忘录”有了内容，让链组件有了“记忆”。使用提示词模板包装器，自定义一个提示词模板字符串。
+ 提示词内容分为四部分：
    - 一是对模型的指导词：“请你回答问题的时候，依据文档内容和聊天记录回答，如果在其中找不到相关信息或者答案，请回答不知道。”；
    - 二是使用问题检索到的相关文档内容；“文档内容是：｛context｝”；三是记忆组件输出的记忆内容：“聊天记录是：｛chat_history｝”；四是用户的输人：“Human：(human _input)"
<pre>
template = "n*你是说中文的 chatbot.
请你回答问题的时候，依据文持内容和脚天记录回答，如果在其中找不到相关信息戒着答案，请回答
不知道。
文档内容是：｛context）
聊天记录是：｛chat_history）
Human: (human_input)
Chatbot:"""
</pre>    

+ LangChain 框架由以下开发库组成。
    - （1）LangChain-Core：基础抽象和 LangChain 表达语言（LCEL）。
    - （2）LangChain-Community：组件及内置的大量第三方技术集成模块，一般被封装为合作伙伴模块（例如 LangChain-openai）。
    - （3）LangChain：构成应用架构的上层核心组件，包括 Chains、Agents 等。
    - （4）Templates：官方提供的一些常见的应用模板。
    - （5）LangServe：将 LangChain 链部署为 REST API 的平台。
    - （6）LangSmith：帮助开发者跟踪调试、测试、评估和监控大模型应用的在线平台。

# 其他

+ Langchain agent是怎么找到search工具并使用的
    - 可以正确识别和调用它，因为它主要是通过 description 语义匹配，而不是看 name 的具体字符串。
    - 但 name 仍然有一定作用，比如：LLM 可能会参考 name 来做初步判断；调试时 name 可以帮助你看日志，知道 Agent 选了哪个工具

+ LLM本身没有内在记忆，每个查询都是独立进行的
    - 所谓的记忆和检索增强生成（RAG）是通过外部手段实现的，即将相关信息添加到提示词模板中


---

# 扩展

## Langchain是怎么做到通过分析语义找到对应工具的
+ From ChatGPT (2025-02-18)

LangChain 通过 **LLM（大模型）+ ReAct 框架** 来分析语义并选择工具。它的核心逻辑是让 LLM **先思考**，再决定用哪个工具，并按照工具的格式调用它。  

### **核心机制**
1. **解析用户问题** → 让 LLM 提取关键语义  
2. **匹配工具描述** → 让 LLM 判断哪个工具最适合  
3. **生成调用指令** → LLM 生成工具的调用格式并执行  
4. **工具返回结果** → LLM 解析工具返回的数据并回复用户  

这套逻辑基于 **ReAct（Reasoning + Acting）** 框架，在 LangChain 里 Agent 主要是用这个方法来动态决策。  


### **1. 解析用户问题**
假设你输入：
```python
agent.run("计算 25 * 4 + 10")
```
LangChain 会把这个问题交给 LLM（如 GPT-4），让它理解用户的意图。

LLM 可能会把你的问题理解成：
- 这是一个数学计算问题  
- 需要找到一个能进行数学计算的工具  
- 计算表达式 `25 * 4 + 10`


### **2. 匹配工具描述**
假设你有两个工具：
```python
Tool(
    name="Calculator",
    func=calculator_tool,
    description="用于数学计算。输入一个数学表达式（如 3 + 5 * 2），输出结果。",
)

Tool(
    name="Wikipedia",
    func=wiki.run,
    description="查询 Wikipedia 词条，输入一个关键词（如 'Python programming'），获取相关信息。",
)
```
LLM 会对比问题和 `description`，发现 **Calculator 的描述里提到了“数学计算”**，所以它会选择 `Calculator` 这个工具。

> **关键点**：LangChain 让 LLM 直接读 `description`，所以工具的名字 `name` 只是一个标识，核心还是 `description` 的语义匹配。


### **3. 生成调用指令**
LangChain 让 LLM 生成一个类似 JSON 的格式，表示它要调用哪个工具：
```json
{
    "action": "Calculator",
    "action_input": "25 * 4 + 10"
}
```
然后 LangChain 会**解析这个指令**，找到 `Calculator` 工具，并把 `25 * 4 + 10` 传给 `func` 去执行。


### **4. 工具返回结果**
计算工具执行：
```python
eval("25 * 4 + 10")  # 计算得到 110
```
LangChain 把 `110` 返回给 LLM，LLM 可能会回复：
```
25 * 4 + 10 = 110
```
最终 `agent.run()` 会输出这个结果。

### **总结**
LangChain 让 LLM 负责：
1. **分析用户语义**
2. **匹配工具（通过 `description`）**
3. **生成调用工具的指令**
4. **解释工具返回的结果**

它的核心是利用 **LLM 的推理能力**，结合 ReAct 让它“思考后再行动”。所以只要 `description` 够清晰，即使 `name` 乱写，它也能找到正确的工具！


---

# Reference
+ 《LangChain入门指南构建高可复用、可扩展的LLM应用程序》
+ 《基于大模型的RAG应用开发与优化——构建企业级LLM应用》
