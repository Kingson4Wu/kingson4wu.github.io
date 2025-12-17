---
title: 对Java、Go、Rust之间的简单对比和总结
date: 2024-11-21 16:42:35
tags: [Java, Go, Rust]
---

>> 工作中接触过多种编程语言，主要是 Java 和 Go，最近因个人兴趣简单学习了 Rust，在这里简单记录总结一下


##  编程语言的GC问题

+ 一般来说，程序需要管理好运行中使用的内存空间，比如传统的C和C++则要求开发者手动管理内存，但这往往导致内存泄漏和安全隐患；而垃圾回收（GC）语言，比如Java和Go在运行时自动回收内存，但存在"停顿"（STW）问题；而Rust则采用独特的所有权系统，通过编译期严格的规则检查，在不增加运行时开销的情况下实现内存安全。

+ GC语言，调用栈和内存一直在变化，不STW无法算出没引用的变量（可回收的内存）； 而Rust通过作用域的规则判断自动回收。另外无GC不代表不在堆分配，是代表没有STW的垃圾回收机制。

+ Rust引入了"所有权"概念，每个值都有且仅有一个所有者，当所有者离开作用域时，值会被自动释放。这种方式不仅避免了运行时垃圾回收的性能开销，还能在编译阶段就发现潜在的内存使用问题，有效防止了常见的内存安全缺陷。


## 设计哲学

+ Java 作为一门成熟的编程语言，其设计理念更多体现在企业级应用和跨平台兼容性上。当然个人认为由此历史包袱也比较重。
+ 相比之下，Go 和 Rust 作为更现代的语言，也各有侧重。Go 语言强调简洁、高效和并发性，而 Rust 则更加注重内存安全、零成本抽象和并发安全性。


## 交叉编译
+ Go 和 Rust 支持各自编译成对应二进制实现跨平台（可以使用交叉编译）；而Java则编译成统一的字节码，依赖平台安装的运行时（JVM）来运行服务（也可以Graalvm直接编译成可执行二进制）

## 工具链
+ 相关工具链完善问题，比如Java性能依赖外部开发，比如arthas，asyncProfiler等；而Go自带pprof，单元测试工具等（Rust 也有一些相应的配套工具）；Java历史包袱重，不够现代化 

## 热加载
+ Java支持热加载（基于 Instrumentation 技术），但也有一定的限制，比如不能新增/删除方法、类等，主要通过字节码替换和类加载器重载实现，一般多在开发阶段使用。实际应用中，JRebel 等商业工具通过更复杂的字节码重写技术，部分突破了这些限制，而Spring DevTools 提供了更轻量的重启机制。
+ Go官方不直接支持热加载；第三方工具如 gin-reload、air 实现热重载（通过监控文件变化，重新编译和启动进程，相对简单直接，但不是语言级特性）
+ Rust同样没有官方直接的热加载机制；比如cargo-watch 可以监听文件变化并重新编译（由于所有权系统，热加载实现相对复杂）

## 远程Debug
+ Java远程调试的原理是两个VM之间通过debug协议进行通信，然后以达到远程调试的目的。两者之间可以通过socket进行通信。
+ Go原生支持远程调试，使用 dlv（Delve）调试器（基于 gRPC 协议通信）
+ Rust支持远程调试，但配置相对较复杂（主要使用 rust-gdb 和 rust-lldb）


## 依赖管理 以及 冲突解决

### Java
+ Java 的依赖管理历史上存在诸多挑战。在早期，Java 并没有原生的依赖版本管理机制，开发者需要依赖 Maven 或 Gradle 等外部构建工具来处理项目依赖。更为关键的是，Java 的依赖冲突解析是基于具体类而非整个 JAR 包，这导致了潜在的版本兼容性和类加载问题。为了彻底解决这一痛点，Java 9 引入了模块化系统（Java Platform Module System, JPMS），提供了更精细和可靠的依赖管理和隔离机制，从根本上改善了包依赖和版本控制的复杂性。这一设计不仅简化了大型项目的依赖管理，还增强了 Java 运行时的安全性和可预测性。

### 关于Java的类重复问题

+ Java 依赖引入的时 Jar 包，使用时则是含路径信息的类名
+ Go则没有这个问题，因为Go的依赖的引入需要指定模块的全路径，使用时也是使用全路径或别名
+ Rust和 Go 类似，依赖的引入也需要指定模块的全路径。但不同包有相应的依赖文件，利用这个使相同依赖的不兼容版本共存而没有冲突问题

+ Java9之前（模块系统之前）- 只能减少，不能从根本上解决
    1. 协议文件生成的代码，重复拷贝和引入，导致类重复冲突
        - 使用RPC协议，idl文件生成java文件，容易因为多处拷贝（比如一些业务通用库也使用到），导致类重复问题，这样在运行时可能会造成影响
        - 这时最好打包的时候，不要将协议文件打进jar包中，让业务使用方自行生成代码
        - 通过扫描jar包路径类的方式，可以协助检查这种问题
        ```java
                String classPath = Optional.ofNullable(thriftClass.getProtectionDomain())
                    .map(ProtectionDomain::getCodeSource)
                    .map(CodeSource::getLocation)
                    .map(URL::getPath).orElse("");

                if (!classPath.contains(jarFileName)) {
                    System.err.println(String.format("%s thrift class may be duplicated", thriftClass.getName()));
                    throw new DuplicatedThriftFileException(String.format("%s thrift class may be duplicated", thriftClass.getName()));
                }
        ```
    2. 通过maven-enforcer插件解决类冲突
        - 本质上就是解压所有依赖的 jar 包，判断是否存在重复的类文件，性能较低
+ JVM中Jar包的加载顺序
    + 由classpath参数指定的顺序决定
    + 如果classpath未明确指明，则由文件系统决定的（readdir函数）
        - readdir并不保证读取后的文件顺序，在不同的操作系统上可能有不同的顺序。
    + 如何找出重复类
        + `find . -name "*.jar" -exec sh -c  'jar -tf {}|grep -H --label {} 'JspRuntimeContext ''` 
        + `-verbose:class` 查看加载顺序 

+ Java9及以上（使用模块系统）

### Go VS Rust 库冲突

+ 当项目间接依赖同一个库的不同版本时，Rust 和 Go 在处理上有什么异同

+ Go 的处理方式：
    <pre>
    依赖关系示例：
    my-project
    ├── A 
    │   └── pkg v1.1.0
    └── B
        └── pkg v1.2.3
    </pre>
    + Go 会：
        - 自动选择最高兼容版本（v1.2.3）
        - 所有代码路径都使用这个版本
        - 使用 MVS (Minimal Version Selection) 算法
        - 在 go.mod 中记录最终版本
        <pre>
            // go.mod
            module my-project

            require (
                A v1.0.0
                B v1.0.0
                pkg v1.2.3 // 间接依赖，统一使用最高版本
            )
        </pre>    
+ Rust 的处理方式：
    <pre>
    依赖关系示例：
    my-project
    ├── A 
    │   └── pkg 1.1.0
    └── B
        └── pkg 1.2.3
    </pre>    
    + Rust 会：
        - 允许两个版本同时存在
        - 分别编译两个版本的代码
        - 在最终二进制中包含两个版本
        <pre>
        Cargo.toml
        [dependencies]
        A = "1.0.0"  # 依赖 pkg 1.1.0
        B = "1.0.0"  # 依赖 pkg 1.2.3
        </pre>
+ 主要区别：
    - Go: 强制统一版本，避免重复
    - Rust: 允许多版本共存，保证兼容性
    - 这种设计反映了两种不同的理念：
        - Go: 简单性优先，避免版本冲突
        - Rust: 灵活性优先，保证正确性

+ 针对依赖同一个库的不同版本的情况：如果版本相同或兼容，Cargo会选择满足要求的当前最高版本；如果版本不兼容，Cargo允许在项目中同时使用这些不兼容的版本，可以通过别名来区分使用。


### 总结
+ 个人看法总结：Rust能做到同时使用同一个库的不同版本，是因为每个项目都有独立的依赖库配置以及引入别名机制，关键的是打包能根据这些信息直接生成二进制。而java是生成 字节码文件，并打包时丢失这方面的信息，虚拟机可能目前由于历史和后续兼容等原因也暂不支持。Go 则是选择简单性优先，避免版本冲突。
+ Rust可以运行同一库不同版本；Go和Java（模块化后）都不允许同一库不同版本；Go通过路径能确定库的唯一性；Java（未模块化）存在不同库类冲突的可能。


## 封装私有性
+ Java通过访问修饰符（public、private、protected）控制（反射可以破坏私有性；运行时检查私有访问）
+ Java 9 模块化（JPMS）后，封装私有性发生了显著变化
    1. 更严格的可见性控制（引入模块（module）概念；模块间显式依赖声明）
    2. 可见性新规则（使用 exports 关键字定义可导出包；opens 关键字控制运行时反射访问）
    3. 相比传统机制（编译期就能检查模块间依赖；避免了类路径的"打开式"依赖）
    4. 实际影响（需要在 module-info.java 显式声明依赖；原有代码需要适配模块系统；更接近 Rust 的模块化设计理念）

+ Go首字母大小写决定可见性（小写标识符包内可见，大写标识符全局可见；没有私有修饰符，依赖命名约定）
+ Rust模块系统提供精细的可见性控制（默认私有；pub 关键字定义可见性；可以精确控制字段、方法的可见范围；编译期检查，性能无额外开销）

+ Rust 的封装性设计最为现代和严格，Go 相对最为简单，Java 则相对传统，Java9 之后更加严格，跟 Rust 类似，但由于历史包袱，又显得比较笨重。


## 并发和多线程

+ 并发线程，Rust为了减少运行时，默认使用线程模型的并发。
+ Go是绿色线程（协程）。
+ Java一般也是线程模型，当然也有一些协程库（其他 JVM 语言比如 kotlin 就自带协程）
    - Java 21 开始，日常用的虚拟线程已经是 Project Loom 正式交付的成果

### 主线程结束进程是否停止

+ 主线程退出：主线程结束，不管其他线程是否结束，进程都会结束，这点Rust和Go一样（go是协程）.
Java则是即使主线程结束，其他线程不结束，进程就不会退出。

### 非主线程异常进程是否停止
+ 默认情况下，非主线程的 panic 不会导致整个进程退出，这点 Rust 和 Java 一样。
    - Java 中未捕获的异常会导致线程终止，但不影响其他线程
    - Rust 的设计更灵活，允许开发者根据需求自行控制（比如使用 std::panic::set_hook() 设置了自定义 panic 处理，可以捕获控制）
+ 而 Go 中 goroutine panic 会导致整个程序崩溃（除非被 recover）

## 面向对象编程
+ 类定义：java Python js 只有class的概念 go 只有struct概念 c++都有 区别是struct可以在栈中定义
+ 面向对象：Java中的单继承其实简化了继承的使用方式， Go和Rust，算是彻底抛弃了使用类继承的方式，选择了接口继承。
+ Java设计之初就是面向对象，加上由于后续历史兼容等原因，代码看起来比较臃肿（类设计）；Rust博采众长，有各自语法糖；Go追求语法简单，表达力不足，会存在一定丑陋的代码（比如没有set， contains，streams等）

## 接口设计和多态  

+ Rust中的 trait 和 Java 以及 Go 的接口：本质上它们都是在解决同一个问题：如何定义和实现抽象行为。主要区别在于语言设计理念导致的一些具体细节   

## 空值问题
+ Go的类型系统一个缺憾是，对于一个类型，它的值是零值，还是不存在值，混淆不清。Java 之前也存在类似的问题，但是后来增加了基础类型的包装类型（例如对于int的Integer，double的Double），Go是否也可以参考一下？或者增加一个Option(al)类型，对这些基础类型再包装一下（基于泛型），当然还有其他更优方案那就更好了
    - JSON包新提案：用“omitzero”解决编码中的空值困局:<https://mp.weixin.qq.com/s/Lw_l_AELo8RKiLzVdS0H-Q>

## 异常处理
+ 异常：Java分为Error和Exception，异常又分为运行时异常和检查性异常。抛出与捕获。
这点和go是类似的，go也区分简单返回的错误error和抛出的恐慌panic，而 Rust 也是差不多这么设计。


## 链式调用
+ 链式调用：Rust和Java支持函数式链式编程，类似stream；Go不支持，要自己实现

+ Rust 的迭代器和 Java 的 Stream API 确实很像，都支持链式调用和函数式编程风格。
+ Go 的设计理念是追求简单直接，所以：
    - 没有内置的链式调用语法
    - 更倾向于使用显式的 for range 循环
    - 性能更可预测（没有懒加载特性）
+ 这反映了不同语言的设计理念：
    - Rust/Java：提供丰富的抽象和函数式编程特性
    - Go：保持简单，倾向于显式的命令式编程

## 其他
+ 枚举：Java和Rust支持，Go不支持；Rust可以支持同个枚举内包含不同类型


## Reference
+ [Gopher的Rust第一课：Rust的依赖管理](https://mp.weixin.qq.com/s/UG-6UuqDiLX15dEZrGGrRA)

## 扩展阅读
+ [Project Loom能否撼动Go和Rust的地位？深入分析三种并发模型](https://mp.weixin.qq.com/s/cJrQJelrFHVzES2iUm76HQ)

