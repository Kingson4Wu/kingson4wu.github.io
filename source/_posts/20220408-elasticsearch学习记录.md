---
title: elasticsearch学习记录
date: 2022-04-28 16:36:10
tags: [elasticsearch]
---

基于ES 7.10下的简要总结

# 一、官方文档链接

+ 文档主页：<https://www.elastic.co/guide/en/elasticsearch/reference/7.10/index.html>
+ rest api: <https://www.elastic.co/guide/en/elasticsearch/reference/7.10/rest-apis.html>
+ Java rest high client: <https://www.elastic.co/guide/en/elasticsearch/client/java-rest/7.10/java-rest-high.html>

# 二、基础简要总结

## 1、REST Client

+ Java Low Level REST Client: 低级别的REST客户端，通过http与集群交互，用户需自己编组请求JSON串，及解析响应JSON串。兼容所有ES版本。
+ Java High Level REST Client: 高级别的REST客户端，基于低级别的REST客户端，增加了编组请求JSON串、解析响应JSON串等相关api。使用的版本需要保持和ES服务端的版本一致，否则会有版本问题。

+ ES 7.0版本中弃用TransportClient客户端，且在8.0版本中完全移除它

## 2、文档元数据

+ 一个文档不仅仅包含它的数据 ，也包含 元数据 —— 有关 文档的信息。 三个必须的元数据元素如下：
	- （1）_index
	文档在哪存放 （粗暴认为相当于Mysql的database）
	- （2）_type
	文档表示的对象类别 （粗暴认为相当于Mysql的table）（在ES7版本开始已经被打上废弃标识）
	-（3）_id
	文档唯一标识
	- （4）其他预定义字段（通常以_开头）
	  - `_timestamp` 记录文档索引时间,`_ttl` 存活时间,  `_source` 原始JSON文档， `_all` 所有字段
	  - `_size`等

### 相关链接
+ ES7为什么废弃type类型：<https://blog.csdn.net/numbbe/article/details/109656567>

## 3、索引的分片数
+ （1）一个分片可以是 主分片或者 副本分片。 索引内任意一个文档都归属于一个主分片，所以主分片的数目决定着索引能够保存的最大数据量。
(索引包含多个主分片,主分片包含多个文档), 技术上来说，一般一个主分片最大能够存储 Integer.MAX_VALUE - 128 个文档；
+ （2）一个副本分片只是一个主分片的拷贝。 副本分片作为硬件故障时保护数据不丢失的冗余备份，并为搜索和返回文档等读操作提供服务。
在索引建立的时候就已经确定了主分片数，但是副本分片数可以随时修改；
+ （3）索引在默认情况下会被分配5个主分片,但是可以在创建时修改；
```
PUT /blogs
{
   "settings" : {
      "number_of_shards" : 3,
      "number_of_replicas" : 1
   }
}
```
- 3个主分片和一份副本（每个主分片拥有一个副本分片）
- 拥有6个分片（3个主分片和3个副本分片）的索引可以最大扩容到6个节点，每个节点上存在一个分片，并且每个分片拥有所在节点的全部资源。
- 如果只是在相同节点数目的集群上增加更多的副本分片并不能提高性能，因为每个分片从节点上获得的资源会变少。 你需要增加更多的硬件资源来提升吞吐量。
但是更多的副本分片数提高了数据冗余量 。

## 4、索引查询路由

+ 路由一个文档到一个分片中
+ Elasticsearch 如何知道一个文档应该存放到哪个分片中呢？
	- `shard = hash(routing) % number_of_primary_shards`

+ routing 是一个可变值，默认是文档的 `_id`
	- 这就解释了为什么要在创建索引的时候就确定好主分片的数量 并且永远不会改变这个数量：因为如果数量变化了，
	- 那么所有之前路由的值都会无效，文档也再也找不到了。

## 5、分析器（Analyzer）和分词器（Tokenizer）

+ Elasticsearch这种全文搜索引擎，会用某种算法对建立的文档进行分析，从文档中提取出有效信息（Token）
+ 对于es来说，有内置的分析器（Analyzer）和分词器（Tokenizer）
+ Es中也支持非常多的分词器：
	- Standard 默认的分词器根据 Unicode 文本分割算法，以单词边界分割文本。它删除大多数标点符号。它是大多数语言的最佳选择。
	- Letter 遇到非字母时分割文本
	- Lowercase 类似 letter ，遇到非字母时分割文本，同时会将所有分割后的词元转为小写
	- Whitespace 遇到空白字符时分割位文本

## 6、文档更新并发控制

+ 更新文档：POST，可以发送部分文档进行更新; upsert (更新或新增文档)；使用脚本来更新文档（不常用）
+ 通过版本来实现并发控制（可以取时间戳作为version参数）
+ 版本冲突时自动重试更新操作（retry_on_conflict 参数）
+ 更新文档其实是先删除旧的文档，再索引新的文档。

## 7、文档查询

+ 在 Elasticsearch 中， 每个字段的所有数据 都是 默认被索引的。 即每个字段都有为了快速检索设置的专用倒排索引
+ 返回文档的一部分: 单个字段能用 `_source` 参数请求得到，多个字段也能使用逗号分隔的列表来指定

## 8、搜索提示

+ Elasticsearch Suggester- Google在用户刚开始输入的时候是自动补全的，而当输入到一定长度，如果因为单词拼写错误无法补全，就开始尝试提示相似的词。
+ 那么类似的功能在Elasticsearch里如何实现呢？ 答案就在Suggesters API。 Suggesters基本的运作原理是将输入的文本分解为token，然后在索引的字典里查找相似的term并返回。

### 总结
+ Term Suggester，基于编辑距离，对analyze过的单个term去提供建议，并不会考虑多个term/词组之间的关系。
+ Phrase Suggester，在Term Suggester的基础上，通过ngram以词组为单位返回建议。
+ Completion Suggester，FST数据结构，类似Trie树，并非使用倒排索引，只能前缀匹配，快速返回
+ Context Suggester，在Completion Suggester的基础上，用于filter和boost

### 相关链接
+ elasticsearch suggest： <https://www.elastic.co/guide/en/elasticsearch/reference/7.10/search-suggesters.html>
+ elasticsearch Term Suggester ：<https://www.cnblogs.com/Neeo/articles/10694969.html>
+ elasticsearch Phrase Suggester： <https://blog.csdn.net/UbuntuTouch/article/details/103952092>
+ elasticsearch completion Suggester: completion ：<https://www.jianshu.com/p/8a6b80813a34>




## 其他

### mapping中的store属性
+ Elasticsearch 理解mapping中的store属性：<https://www.cnblogs.com/sanduzxcvbnm/p/12157453.html>

### searchType

+ QUERY_THEN_FETCH,QUERY_AND_FEATCH,DFS_QUERY_THEN_FEATCH和DFS_QUERY_AND_FEATCH
+ 总结一下， 从性能考虑 QUERY_AND_FETCH 是最快的， DFS_QUERY_THEN_FETCH 是最慢的。从搜索的准确度来说， DFS 要比非 DFS 的准确度更高。

#### 相关链接
+ <https://www.cnblogs.com/ningskyer/articles/5984346.html>
+ <https://segmentfault.com/a/1190000015409044>

# 三、DSL全文搜索

+ Elasticsearch Query DSL之全文检索(Full text queries) ： https://blog.csdn.net/prestigeding/article/details/102295397

## 1、match query

+ 标准的全文检索模式，包含模糊匹配、前缀或近似匹配等。
```
"query": {
"match" : {
"message" : "this out Elasticsearch"
}
}
```
```java
SearchSourceBuilder sourceBuilder = new SearchSourceBuilder();
sourceBuilder.query(QueryBuilders.matchQuery("message", "this out elasticsearch"));
```

## 2. match_phrase query
+ 与match query类似，但只是用来精确匹配的短语。
+ 如果查询字符串为 quick fox，分词后的词根序列为 quick fox，与原词根序列不匹配。如果指定slop属性，设置为1，则匹配，其表示每一个词根直接跳过一个词根形成新的序列，与搜索词根进行比较，是否匹配。

## 3. match_phrase_prefix query
+ 与match_phrase查询类似，但是在最后一个单词上执行通配符搜索。
```
GET /_search
{
    "query": {
        "match_phrase_prefix" : {
            "message" : {
                "query" : "quick brown f",
                "max_expansions" : 10
            }
        }
    }
}
```
+ 默认查找50组，受参数max_expansions控制，在使用时请设置合理的max_expansions，该值越大，查询速度将会变的更慢。该技术主要完成及时搜索，指用户在输入过程中，就根据前缀返回查询结果，随着用户输入的字符越多，查询的结果越接近用户的需求。

## 4. multi_match query （多字段查询）
### type 属性
+ 指定multi_query内部的执行方式，取值如下：best_fields、most_fields、cross_fields、phrase、phrase_prefix （5种）。
### 总结
+ best_fields 按照match检索，所有字段单独计算得分并取最高分的field为最终_score，虽然是默认值，但不建议使用，数据量上来后查询性能会下降
+ most_fields 按照match检索，融合所有field得分为最终_score
+ cross_fields 将fields中的所有字段融合成一个大字段进行match检索，此时要求所有字段使用相同分析器
+ phrase 按照match_phrase检索，默认slop为0，执行短语精确匹配，所以即便设置 minimum_should_match 也无效; 取最高字段得分
+ phrase_prefix 按照match_phrase_prefix检索，滑动步长slop默认为0；取最高字段得分
+ bool_prefix 按照match_bool_prefix检索

+ slop参数告诉match_phrase查询词条能够相隔多远时仍然将文档视为匹配。相隔多远的意思是，你需要移动一个词条多少次来让查询和文档匹配？
我们以一个简单的例子来阐述这个概念。为了让查询quick fox能够匹配含有quick brown fox的文档，我们需要slop的值为1

### 1、best_fields

+ type默认值，只要其中一个字段匹配则匹配文档（match query)。但是使用最佳匹配的字段的score来表示文档的分数，会影响文档的排序。

### 2、most_fields

+ 查找匹配任何字段并结合每个字段的_score的文档，Elasticsearch会为每个字段生成一个match查询，然后将它们包含在一个bool查询中。其算法的核心是各个字段的评分相加作为文档的最终得分参与排序。

+ 其建议场景是不同字段对同一关键字的存储维度不一样，例如字段一可能包含同义词、词干、变音符等；字段二可能包含原始词根，这种情况下综合各个字段的评分就会显的更加具有相关性。

### 3、phrase、phrase_prefix

+ 这两种类型score的计算采用best_fields方法，但是其查询方式分别为match_phrase、match_phrase_prefix

### 4、cross_fields

+ 交叉字段，对于需要匹配多个字段的结构化文档，cross_fields类型特别有用。例如，在查询“Will Smith”的first_name和last_name字段时，在一个字段中可能会有“Will”，而在另一个字段中可能会有“Smith”。这听起来很象most_fields，cross_fields与most_fields的两个明显区别如下：
+ 对于opreator、minimum_should_match的作用域不一样，most_fields是针对字段的，（遍历每个字段，然后遍历查询词根列表，进行逐一匹配），而cross_fields是针对词根的，即遍历词根列表，搜索范围是所有字段。
+ 相关性的考量不相同，cross_fields重在这个交叉匹配，对于一组查询词根，一部分出现在其中一个字段，另外一部分出现在另外一个字段中，其相关性计算评分将更高。

### tie_breaker属性

+ 默认情况下，每个词汇混合查询将使用组中任何字段返回的最佳分数，然后将这些分数相加，以给出最终分数。tie_breaker参数可以改变每项混合查询的默认行为。
+ tie_breaker可选值如下：
	- 0.0 ： 默认行为，使用最佳字段的score。
	- 1.0 ：所有匹配字段socre的和。
	- 0.0 ~ 1.0 : 使用最佳匹配字段的score + (其他匹配字段score) * tie_breaker。

### most_fields vs cross_fields

+ most_fields: Finds documents which match any field and combines the `_score` from each field.
+ cross_fields: Treats fields with the same analyzer as though they were one big field. Looks for each word in any field.

+ Elasticsearch搜索之cross_fields分析: <https://www.cnblogs.com/clonen/p/6674939.html>

+ cross_fields类型采用了一种以词条为中心(Term-centric)的方法，这种方法和best_fields及most_fields采用的以字段为中心(Field-centric)的方法有很大的区别。

### most_field vs best_field
+ <https://www.cnblogs.com/lovezhr/p/14421872.html>

+ best-fields策略，主要是说将某一个field匹配尽可能多的关键词的doc优先返回回来
+ most-fields策略，主要是说尽可能返回更多field匹配到某个关键词的doc，优先返回回来

+ 两者差异
	- （1）best_fields，是对多个field进行搜索，挑选某个field匹配度最高的那个分数，同时在多个query最高分相同的情况下，在一定程度上考虑其他query的分数。简单来说，你对多个field进行搜索，就想搜索到某一个field尽可能包含更多关键字的数据
		- 优点：通过best_fields策略，以及综合考虑其他field，还有minimum_should_match支持，可以尽可能精准地将匹配的结果推送到最前面
		- 缺点：除了那些精准匹配的结果，其他差不多大的结果，排序结果不是太均匀，没有什么区分度了
		- 实际的例子：百度之类的搜索引擎，最匹配的到最前面，但是其他的就没什么区分度了
	- （2）most_fields，综合多个field一起进行搜索，尽可能多地让所有fieldquery参与到总分数的计算中来，此时就会是个大杂烩，出现类似best_fields案例最开始的那个结果，结果不一定精准，某一个document的一个field包含更多的关键字，但是因为其他document有更多field匹配到了，所以排在了前面；所以需要建立类似sub_title.std这样的field，尽可能让某一个field精准匹配query string，贡献更高的分数，将更精准匹配的数据排到前面
		- 优点：将尽可能匹配更多field的结果推送到最前面，整个排序结果是比较均匀的
		- 缺点：可能那些精准匹配的结果，无法推送到最前面
		- 实际的例子：wiki，明显的most_fields策略，搜索结果比较均匀，但是的确要翻好几页才能找到最匹配的结果

#### 相关链接
+ <https://blog.csdn.net/prestigeding/article/details/102295397>
+ <https://www.jianshu.com/p/2a27b4985331>

## 5. common terms query

+ 相比match query，消除停用词与高频词对相关度的影响。
+ 定位：排除停用词或高频词对文档的匹配影响。提高文档匹配的精确度，同时不对性能产生影响。

## 6. query_string query

+ 查询字符串方式。query_string查询解析器支持对查询字符串按照操作符进行切割，每个部分独立分析
```
GET /_search
{
    "query": {
        "query_string" : {
            "default_field" : "content",
            "query" : "(new york city) OR (big apple)"
        }
    }
}
```

+ 多字段支持（multi field）
```
GET /_search
{
    "query": {
        "query_string" : {
            "fields" : ["content", "name"],
            "query" : "this AND that"
        }
    }
}
```
+ 其含义类似于：“query”: “(content:this OR name:this) AND (content:that OR name:that)”。
+ 同时query_string(查询字符串)模式同样支持match_query等查询对应的参数，其工作机制一样

## 7. simple_query_string query
+ 简单查询字符串方式
+ 使用SimpleQueryParser解析上下文的查询。与常规的query_string查询不同，simple_query_string查询永远不会抛出异常，并丢弃查询的无效部分

## 其他

- match_all 查询
- match 查询
- multi_match 查询
- range 查询
- term 查询
- terms 查询
- exists 查询
- missing 查询

+ bool 查询
	- must
	文档 必须 匹配这些条件才能被包含进来。
	- must_not
	文档 必须不 匹配这些条件才能被包含进来。
	- should
	如果满足这些语句中的任意语句，将增加 _score ，否则，无任何影响。它们主要用于修正每个文档的相关性得分。
	- filter
	必须 匹配，但它以不评分、过滤模式来进行。这些语句对评分没有贡献，只是根据过滤标准来排除或包含文档。
	如果没有 must 语句，那么至少需要能够匹配其中的一条 should 语句。但，如果存在至少一条 must 语句，则对 should 语句的匹配没有要求。

# 四、扩展

## 1、索引别名和零停机

+ 重建索引的问题是必须更新应用中的索引名称。 索引别名就是用来解决这个问题的。
+ 索引 别名 就像一个快捷方式或软连接，可以指向一个或多个索引，也可以给任何一个需要索引名的API来使用。
+ 在应用中使用别名而不是索引名。然后就可以在任何时候重建索引。
+ 准备好数据才能切换。
+ 新增新字段不需要重建索引。


### 重新索引数据

+ 尽管可以增加新的类型到索引中，或者增加新的字段到类型中，但是不能添加新的分析器或者对现有的字段做改动。 如果你那么做的话，结果就是那些已经被索引的数据就不正确， 搜索也不能正常工作。
+ 对现有数据的这类改变最简单的办法就是重新索引：用新的设置创建新的索引并把文档从旧的索引复制到新的索引。
+ 为了有效的重新索引所有在旧的索引中的文档，用 scroll 从旧的索引检索批量文档 ， 然后用 bulk API 把文档推送到新的索引中。
+ (从Elasticsearch v2.3.0开始， Reindex API 被引入。它能够对文档重建索引而不需要任何插件或外部工具。)

### 使用reindex api将旧索引数据导入新索引

+ <https://www.elastic.co/guide/en/elasticsearch/reference/7.10/docs-reindex.html>
+ reindex的底层是scroll实现
```
POST _reindex
{
 "source": {
  "index": "song.20220425_3"
 },
 "dest": {
  "index": "song.20220425_4"
 }
}
```

### 新索引同时在写数据，如何防止冲突？
+ 默认情况下，当发生 version conflict 的时候，_reindex 会被 abort，任务终止【此时数据还没有 reindex 完成】，在返回体中的 failures 指标中会包含冲突的数据【有时候数据会非常多】，除非把 conflicts 设置为 proceed。
+ （1）只创建目标索引中缺少的文档
	```
	POST _reindex
	{
	"source": {
	"index": "pigg_test"
	},
	"dest": {
	"index": "pigg_test2",
	"op_type": "create"
	}
	}
	```
+ （2）版本高的才复制
	- external 等同 external_gt
	- <https://www.elastic.co/guide/en/elasticsearch/reference/7.10/docs-index_.html#index-version-types>
	```
	POST _reindex
	{
	"source": {
	"index": "twitter"
	},
	"dest": {
	"index": "new_twitter",
	"version_type": "external"
	}
	}
	```

### 如何提升迁移效率？

+ 默认情况下，_reindex使用1000进行批量操作，您可以在source中调整batch_size。

### 如何查看执行进度？
+ 默认执行同步返回结果的。

#### 异步执⾏
+ 如果 reindex 时间过⻓，建议加上 wait_for_completion=false 的参数条件，这样 reindex 将直接返回 taskId。
<pre>
POST /_reindex?wait_for_completion=false
	{
	    "source": {
	        "index": "blog"
	    },
	    "dest": {
	        "index": "blog_lastest"
	    }
	}
	
	返回：
	
	{
	  "task" : "dpBihNSMQfSlboMGlTgCBA:4728038"
	}
</pre>

### 根据taskId可以实时查看任务的执行状态
+ 一般来说，如果我们的 source index 很大【比如几百万数据量】，则可能需要比较长的时间来完成 _reindex 的工作，可能需要几十分钟。而在此期间不可能一直等待结果返回，可以去做其它事情，如果中途需要查看进度，可以通过 _tasks API 进行查看。
+ `GET /_tasks/{taskId}`

### 如何取消任务?
+ `POST _tasks/task_id/_cancel`

### 相关链接
+ <https://zhuanlan.zhihu.com/p/341337374>


## 2、深分页问题

+ 需要从集群取回大量的文档，使用游标查询 Scroll：<https://www.elastic.co/guide/en/elasticsearch/reference/7.10/scroll-api.html>
+ scroll 查询 可以用来对 Elasticsearch 有效地执行大批量的文档查询，而又不用付出深度分页那种代价。
+ 游标查询会取某个时间点的快照数据。 查询初始化之后索引上的任何变化会被它忽略。
+ 它通过保存旧的数据文件来实现这个特性，结果就像保留初始化时的索引 视图 一样。
+ 深度分页的代价根源是结果集全局排序，如果去掉全局排序的特性的话查询结果的成本就会很低。
+ 启用游标查询可以通过在查询的时候设置参数 scroll 的值为我们期望的游标查询的过期时间。
+ 这个过期时间的参数很重要，因为保持这个游标查询窗口需要消耗资源，所以我们期望如果不再需要维护这种资源就该早点儿释放掉。
设置这个超时能够让 Elasticsearch 在稍后空闲的时候自动释放这部分资源。
+ 查询的返回结果包括一个字段 `_scroll_id`， 它是一个base64编码的长字符串
+ 尽管我们指定字段 size 的值为1000，我们有可能取到超过这个值数量的文档。 当查询的时候， 字段 size 作用于单个分片，所以每个批次实际返回的文档数量最大为 `size * number_of_primary_shards` 。
+ 注意游标查询每次返回一个新字段 `_scroll_id`。每次我们做下一次游标查询， 我们必须把前一次查询返回的字段 `_scroll_id` 传递进去。当没有更多的结果返回的时候，我们就处理完所有匹配的文档了。


+ 理解为什么深度分页是有问题的，我们可以假设在一个有 5 个主分片的索引中搜索。 当我们请求结果的第一页（结果从 1 到 10 ），每一个分片产生前 10 的结果，并且返回给 协调节点 ，协调节点对 50 个结果排序得到全部结果的前 10 个。
+ 现在假设我们请求第 1000 页--结果从 10001 到 10010 。所有都以相同的方式工作除了每个分片不得不产生前10010个结果以外。 然后协调节点对全部 50050 个结果排序最后丢弃掉这些结果中的 50040 个结果。
+ 可以看到，在分布式系统中，对结果排序的成本随分页的深度成指数上升。这就是 web 搜索引擎对任何查询都不要返回超过 1000 个结果的原因。

+ 排序过程可能会变得非常沉重，使用大量的CPU、内存和带宽。因为这个原因，我们强烈建议你不要使用深分页。
+ 实际上， “深分页” 很少符合人的行为。当2到3页过去以后，人会停止翻页，并且改变搜索标准。
+ 会不知疲倦地一页一页的获取网页直到你的服务崩溃的罪魁祸首一般是机器人或者web spider。
+ 如果确实 需要从你的集群取回大量的文档，你可以通过用 scroll 查询禁用排序使这个取回行为更有效率。

## 3、highlight 参数

+ <https://www.elastic.co/guide/en/elasticsearch/reference/7.10/highlighting.html>
```
GET /_search
{
 "query": {
  "match": {
   "content": "kimchy"
  }
 },
 "highlight": {
  "fields": {
   "content": {}
  }
 }
}
```

+ ragment_size ：指定高亮数据展示多少个字符回来； 
	fragment_size The size of the highlighted fragment in characters. Defaults to 100

## 4、聚合（aggregations）

+ 允许我们基于数据生成一些精细的分析结果

+ 加载和搜索相匹配的文档，并且完成各种计算。
+ 两种类型的聚集：桶型和度量型
	- 度量型 ： 某个字段最大值，最小值，平均值等
	- 桶型 ：某个论坛最流行的帖子等

## 5、集群扩容、故障转移

+ <https://www.elastic.co/guide/en/elasticsearch/reference/7.10/scalability.html>

## 6、运维监控

+ <https://www.elastic.co/guide/en/elasticsearch/reference/7.10/monitor-elasticsearch-cluster.html>

## 7、es 日志， 慢搜索，慢索引

+ <https://www.elastic.co/guide/en/elasticsearch/reference/7.10/index-modules-slowlog.html>

## 8、相关性
+ Elasticsearch 相关度评分 TF&IDF算法：<https://www.jianshu.com/p/05219358a2e9>

+ fuzzy 查询会计算与关键词的拼写相似程度，terms 查询会计算 找到的内容与关键词组成部分匹配的百分比，
+ 但是通常我们说的 relevance 是我们用来计算全文本字段的值相对于全文本检索词相似程度的算法。

+ Elasticsearch 的相似度算法 被定义为检索词频率/反向文档频率， TF/IDF ，包括以下内容：
	- 检索词频率
	检索词在该字段出现的频率？出现频率越高，相关性也越高。 字段中出现过 5 次要比只出现过 1 次的相关性高。
	- 反向文档频率
	每个检索词在索引中出现的频率？频率越高，相关性越低。检索词出现在多数文档中会比出现在少数文档中的权重更低。
	- 字段长度准则
	字段的长度是多少？长度越长，相关性越低。 检索词出现在一个短的 title 要比同样的词出现在一个长的 content 字段权重更大。

+ 控制相关度：
<https://www.elastic.co/guide/en/elasticsearch/reference/7.10/search-rank-eval.html>

## 9、explain api

+ <https://www.elastic.co/guide/en/elasticsearch/reference/7.10/_explain_analyze.html>

## 10、refresh API 和  flush API

+ 重点：新段会被先写入到文件系统缓存，refresh则是从这个文件缓存获取新段（写入和打开一个新段的轻量的过程叫做 refresh ）
默认一秒刷新，可以设置

+ 在 Elasticsearch 中，写入和打开一个新段的轻量的过程叫做 refresh 。 默认情况下每个分片会每秒自动刷新一次。这就是为什么我们说 Elasticsearch 是 近 实时搜索: 文档的变化并不是立即对搜索可见，但会在一秒之内变为可见。

+ 如果没有用 fsync 把数据从文件系统缓存刷（flush）到硬盘，我们不能保证数据在断电甚至是程序正常退出之后依然存在。为了保证 Elasticsearch 的可靠性，需要确保数据变化被持久化到磁盘。

+ 在 动态更新索引，我们说一次完整的提交会将段刷到磁盘，并写入一个包含所有段列表的提交点。Elasticsearch 在启动或重新打开一个索引的过程中使用这个提交点来判断哪些段隶属于当前分片。
+ 即使通过每秒刷新（refresh）实现了近实时搜索，我们仍然需要经常进行完整提交来确保能从失败中恢复。
+ Elasticsearch 增加了一个 translog ，或者叫事务日志，在每一次对 Elasticsearch 进行操作时均进行了日志记录。通过 translog
+ translog 提供所有还没有被刷到磁盘的操作的一个持久化纪录。当 Elasticsearch 启动的时候， 它会从磁盘中使用最后一个提交点去恢复已知的段，并且会重放 translog 中所有在最后一次提交后发生的变更操作。
+ translog 也被用来提供实时 CRUD 。当你试着通过ID查询、更新、删除一个文档，它会在尝试从相应的段中检索之前， 首先检查 translog 任何最近的变更。这意味着它总是能够实时地获取到文档的最新版本。
+ 这个执行一个提交并且截断 translog 的行为在 Elasticsearch 被称作一次 flush 。 分片每30分钟被自动刷新（flush），或者在 translog 太大的时候也会刷新。

+ flush API 可以 被用来执行一个手工的刷新（flush）
`POST /blogs/_flush` , `POST /_flush?wait_for_ongoin`




# 五、常用REST命令


+ PUT 谓词(“使用这个 URL 存储这个文档”)，
+ POST 谓词(“存储文档在这个 URL 命名空间下”)
+ GET 查询
+ DELETE 删除
+ HEAD 检查文档是否存在

+ 某些特定语言（特别是 JavaScript）的 HTTP 库是不允许 GET 请求带有请求体的。 事实上，一些使用者对于 GET 请求可以带请求体感到非常的吃惊。
+ 而事实是这个RFC文档 RFC 7231— 一个专门负责处理 HTTP 语义和内容的文档 — 并没有规定一个带有请求体的 GET 请求应该如何处理！
+ 结果是，一些 HTTP 服务器允许这样子，而有一些 — 特别是一些用于缓存和代理的服务器 — 则不允许。
+ 对于一个查询请求，Elasticsearch 的工程师偏向于使用 GET 方式，因为他们觉得它比 POST 能更好的描述信息检索（retrieving information）的行为。
然而，因为带请求体的 GET 请求并不被广泛支持，所以 search API 同时支持 POST 请求

### 扩展
+ https://www.cnblogs.com/nankezhishi/archive/2012/06/09/getandpost.html#!comments
+ 不是所有客户端都支持发起带有body的HTTP GET请求，比如jQuery就直接限制了


## 1、数据索引

+ 数据的mapping一般只执行一次，不使用代码方式创建，使用curl即可
关掉自动映射：即"dynamic":"false"， 未预先定义的字段不自动保存
```
$ curl -X PUT 'localhost:9200/accounts' -d '
{
 "mappings": {
  "dynamic" : "false",
  "properties": {
   "user": {
    "type": "text",
    "analyzer": "ik_max_word",
    "search_analyzer": "ik_max_word"
   },
   "title": {
    "type": "text",
    "analyzer": "ik_max_word",
    "search_analyzer": "ik_max_word"
   },
   "desc": {
    "type": "text",
    "analyzer": "ik_max_word",
    "search_analyzer": "ik_max_word"
   }
  }
 }
}' 
```

## 2、分析查询
```
$ curl -X POST -H Content-Type:application/json 'localhost:9200/_analyze' -d '
{
"analyzer":"ik_max_word",
"text":"中华人民共和国国歌"
}' 
```

```
POST _analyze
{
"text": "我爱北京天安门",
"analyzer": "icu_analyzer"

```

## 3、查看索引
+ `curl -X GET "localhost:19200/xxxxxx/_mapping?pretty"`
+ `curl -X GET "localhost:19200/_cat/indices"`

## 4、索引别名
```
curl -XPOST 'http://localhost:9200/_aliases' -d '
{
 "actions": [{
  "add": {
   "index": "testtmp",
   "alias": "test"
  }
 }]
}'
```

## 5、替换别名
```
POST _aliases
{
 "actions": [{
  "remove": {
   "index": "anchor.20220421",
   "alias": "anchor"
  }
 }, {
  "add": {
   "index": "anchor.20220422",
   "alias": "anchor"
  }
 }]
}
```

## 6、查看ES版本
```
curl -XGET localhost:19200
{
 "name": "node-1",
 "cluster_name": "es6_dev_2",
 "cluster_uuid": "MG_zNwBhQZC1C4Yjm8IFQA",
 "version": {
  "number": "6.7.1",
  "build_flavor": "default",
  "build_type": "tar",
  "build_hash": "2f32220",
  "build_date": "2019-04-02T15:59:27.961366Z",
  "build_snapshot": false,
  "lucene_version": "7.7.0",
  "minimum_wire_compatibility_version": "5.6.0",
  "minimum_index_compatibility_version": "5.0.0"
 },
 "tagline": "You Know, for Search"
}
```

## 7、文档索引
```
PUT anchor/_doc/1?version=2&version_type=external
{
"id": "54354",
"userId": 324325,
"nickname":"i love you",
"searchStatus": 1,
"weight": 99 
}
```

## 8、查看索引数量
```
GET /_cat/count/song?v
```

# 六、其他

## 1、jdk版本

+ 由于Elasticsearch依赖于jdk，es和jdk有着对应的依赖关系。具体可见：
https://www.elastic.co/support/matrix
https://www.elastic.co/guide/en/elasticsearch/reference/7.10/setup.html

## 2、安装问题

+ https://www.cnblogs.com/heyongboke/p/11379472.html
+ https://www.jianshu.com/p/64d4b7472cfb

## 3、String类型已弃用

+ String：string（弃用）, text, keyword（ElasticSearch 5.0开始支持）

+ ElasticSearch数据类型--string类型已死, 字符串数据永生: <https://segmentfault.com/a/1190000008897731>

### text vs keyword

+ Elasticsearch中text与keyword的区别:
<https://www.cnblogs.com/sanduzxcvbnm/p/12177377.html>

+ text类型
	- 1:支持分词，全文检索,支持模糊、精确查询,不支持聚合,排序操作;
	- 2:test类型的最大支持的字符长度无限制,适合大字段存储；
	- 使用场景：
		存储全文搜索数据, 例如: 邮箱内容、地址、代码块、博客文章内容等。
		默认结合standard analyzer(标准解析器)对文本进行分词、倒排索引。
		默认结合标准分析器进行词命中、词频相关度打分。

+ keyword
	- 1:不进行分词，直接索引,支持模糊、支持精确匹配，支持聚合、排序操作。
	- 2:keyword类型的最大支持的长度为——32766个UTF-8类型的字符,可以通过设置ignore_above指定自持字符长度，超过给定长度后的数据将不被索引，无法通过term精确匹配检索返回结果。
	- 使用场景：
		存储邮箱号码、url、name、title，手机号码、主机名、状态码、邮政编码、标签、年龄、性别等数据。
		用于筛选数据(例如: select * from x where status='open')、排序、聚合(统计)。
		直接将完整的文本保存到倒排索引中。

## 4、客户端代码转curl技巧
+ 该方法仅限于使用rest client的情况
+ 有时想知道代码实际发出的请求是怎样的，并且在控制台进行快速调整测试，可以怎么做？
+ 其中一个方法就是使用代理（fiddler、whistle等）抓包。

### （1）连接 ES时指定代理
```java
 RequestConfig.Builder builder = RequestConfig.custom()
 builder.setProxy(new HttpHost(proxyHost, proxyPort));
```
### （2）如果连接的ES是HTTPS的，那么需要安装代理导出的证书
```shell keytool -import -alias whistle -keystore cacerts -file rootCA.crt ```



# 后记
+ 很多东西不用纠结，以前每看一次es，都会纠结类型怎么使用合理，实际上这本书就是一个不合理的设计，官方最后也承认并废弃了





