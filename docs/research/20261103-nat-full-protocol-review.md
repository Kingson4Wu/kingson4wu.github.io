# NAT/P2P 文章的全文协议与逻辑复核

日期：2026-11-03。对象：`content/zh/posts/20261102-nat-traversal-p2p-tailscale.md`（本轮复核开始时版本）。本记录独立对照协议与操作系统资料，不以此前审稿结论作证据。未修改正文或 `evals/claims.json`。

## 结论

本轮没有发现需要推翻文章主要机制的协议错误。已限定外部映射复用、对应来源过滤、主机允许与应用接收的 UDP 例子成立。TCP 同时打开图也与现行 TCP 标准一致。仍有三处值得修正：映射分类表没有完整表达 ADM 的充要条件，多路径段把“全程独立路径”说成了过强的必要条件，通用 UDP 隧道的性能部分又把加解密写成了共同属性。另有一处 ICE 时序可以小幅澄清，但现文的候选表已给出正确边界，不能将其判成事实错误。

## 建议修正的三处

### 1. ADM 分类表只写了复用的正面条件

原句：

> 依赖目标 IP，ADM | 访问同一目标 IP 的不同端口时复用

**判定：定义不完整，容易使分类重叠，不是该句所述情况本身错误。** EIM 同样满足“同一 IP 的不同端口时复用”。ADM 的区分点还包括目标 IP 改变时不复用同一映射。正文后面的“可能使用另一个端点”并不能完整替代这个分类条件。

依据：[RFC 4787 §4.1](https://www.rfc-editor.org/rfc/rfc4787.html#section-4.1)，ADM 定义中的 if and only if；APDM 则以目标 IP 和端口二者构成充要条件。

建议表格：

| 规则 | 映射复用条件 |
|---|---|
| EIM | 目标 IP、端口变化时仍复用 |
| ADM | 目标 IP 相同则复用，改变 IP 则使用不同映射 |
| APDM | 目标 IP 和端口都相同则复用，任一改变则使用不同映射 |

表格之前或之后继续保留同一协议、内部 IP/端口与映射有效期前提，避免把超时重新分配当成目标依赖。

### 2. 多路径利用额外容量不要求全程物理独立

原句：

> 真正存在多条独立网络路径时，才有机会利用额外的带宽资源，例如分别使用两个网络出口。

**判定：必要条件说得过强。** 多条路径可以共享部分链路；是否增加吞吐量取决于可用容量、共享瓶颈、流量调度和拥塞控制，而非是否全程独立。共享同一个已经饱和的瓶颈时，增加路径不会增加那个瓶颈的物理容量；部分共享但能利用其他闲置资源时，则仍可能受益。原文“多开 Socket 不自动增加物理链路容量”的判断应保留。

依据：[RFC 8684 §1](https://www.rfc-editor.org/rfc/rfc8684.html#section-1)，MPTCP 的多个子流与路径目标；[RFC 6356 §2](https://www.rfc-editor.org/rfc/rfc6356.html#section-2)，明确考虑多个子流共享瓶颈，并讨论吞吐、公平性和拥塞平衡。RFC 6356 是实验性拥塞算法说明，这里仅用作共享瓶颈不能被忽略的机制证据，不建议把某一算法推广为全部多路径实现。

建议直接替换：

> 多条路径如果能够利用额外的可用带宽，就可能提高总吞吐量，例如分别使用两个网络出口。路径不必全程独立；关键是它们共享哪些瓶颈，以及流量能否被合理分配。如果最后仍受同一条已饱和链路限制，总吞吐量就不会因为多开几个 Socket 而继续增加。

### 3. 通用 UDP 隧道不必加密

原句：

> 这些业务各自维护需要的状态。它们的内层数据包被加密，通过外层路径发送；对端解密后，系统再根据内层 IP、协议和端口交给对应应用。

**判定：范围不一致，应限定或泛化。** 第六部分由一般 UDP 隧道展开，但此处将所有内层数据都写成加密与解密。UDP 只提供数据报传输，隧道的核心是封装；加密是 WireGuard 等具体安全隧道协议提供的能力。结合第五部分可以理解作者沿用 WireGuard 场景，但跨到通用性能讨论后应明确这个前提。

依据：[RFC 768](https://www.rfc-editor.org/rfc/rfc768.html) 定义 UDP 数据报服务；[WireGuard 官方协议说明，Subsequent Messages: Exchange of Data Packets](https://www.wireguard.com/protocol/) 明确通过 AEAD 加密封装数据，该能力属于 WireGuard 协议。

建议直接替换：

> 这些业务各自维护需要的状态。内层数据包经过隧道封装，通过外层路径发送；对端解封装后，系统再根据内层 IP、协议和端口交给对应应用。WireGuard 这类加密隧道还会对内层数据加密，并在对端完成解密。

同时将该小节图中的“加密封装”改为“隧道封装”。后面的通用接收路径“解密和业务处理”、不同线程“处理解密与业务”等表述，也应改成“隧道处理和业务处理”，或在第六部分开头统一限定讨论 WireGuard 等加密 IP 隧道。无需把整个章节都改成专门介绍 WireGuard。

## 可选澄清

### 4. ICE 的 peer-reflexive 候选在检查中发现

原句：

> ICE 收集这些候选，与对方交换信息，再组合成本地与远端的地址对进行检查，最终选定可用的组合。

**判定：初始流程概括成立；配合后面的四类候选表，可能让读者误以为四类候选全在检查前收集。** 但现表已经将 Peer-reflexive 正确标为检查中发现，因此不应判为现有认知错误。若想消除时序歧义，可用一句话补充。

依据：[RFC 8445 §5.1.1](https://www.rfc-editor.org/rfc/rfc8445.html#section-5.1.1)、§7.2.5.3.1、§7.3.1.3。前三类中 host、server-reflexive、relayed 可在初始阶段获得；peer-reflexive 来源于后续连通性检查。

建议：

> ICE 先交换已获得的候选，再对本地与远端地址的组合进行检查；检查过程中还可能发现新的 peer-reflexive 候选。最终按优先级和提名规则选定可用地址对。

无需把该可选术语细节加到入门部分。

## 已核对且无需推翻的论述

| 位置/主题 | 判定与条件 | 一手依据 |
|---|---|---|
| 第一部分：NAT、过滤、应用接收 | 当前分别说明转换目标、独立入站策略和接收程序；不再把全部网络可达性归结为一份 NAT 记录 | [RFC 4787 §4.1/§5](https://www.rfc-editor.org/rfc/rfc4787.html)、[Linux socket(7)](https://man7.org/linux/man-pages/man7/socket.7.html) |
| 第二部分：一方可达时反向建立连接 | 业务发起方向不必等同底层主动建连方向，当前保留了接收方可达及网络允许条件 | [RFC 5128 §3.2](https://www.rfc-editor.org/rfc/rfc5128.html#section-3.2) |
| 第三部分：UDP 三步探测 | 同一外部映射被复用，且双方采用按 IP/端口限制来源的过滤时，首包可能丢弃、B 出站及 A 重试使双向通信可用；不要求严格同时 | [RFC 5128 §3.3.1](https://www.rfc-editor.org/rfc/rfc5128.html#section-3.3.1)、[RFC 4787 §5](https://www.rfc-editor.org/rfc/rfc4787.html#section-5) |
| UDP 应答 | 当前明确 UDP 不提供交付确认，探测应答属于应用为验证路径设计的机制，不等于逐包 ACK 要求 | [RFC 768](https://www.rfc-editor.org/rfc/rfc768.html) |
| 本地端点保持及探测范围 | 当前说明保持本地源 IP/端口，换端点可能产生新映射；UDP 路径检查不证明其他端口或 TCP 服务可达 | [RFC 5128 §3.3.1](https://www.rfc-editor.org/rfc/rfc5128.html#section-3.3.1)、[RFC 7857 §5–6](https://www.rfc-editor.org/rfc/rfc7857.html#section-5) |
| 过滤表 EIF/ADF/APDF | 指向对应本地端点的有效映射/出站记录，来源限制按 IP 或 IP+端口区分；不将其当作所有防火墙的放行保证 | [RFC 4787 §5](https://www.rfc-editor.org/rfc/rfc4787.html#section-5) |
| TCP 同时打开 | 双方先发送 SYN，收到对方 SYN 后交换 SYN+ACK，图示按忽略重传的标准过程表示；不应改成必需再追加一轮纯 ACK | [RFC 9293 §3.5 Figure 7](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.5) |
| ICE-TCP 范围 | active、passive、simultaneous-open 分别定义不同连接角色；不是全部 TCP 候选都使用同时打开 | [RFC 6544 §3](https://www.rfc-editor.org/rfc/rfc6544.html#section-3) |
| TURN 两段传输 | 基础 TURN 的客户端连接允许 UDP/TCP/TLS/DTLS，服务端到 peer 为 UDP；TCP allocation 另有扩展，现文范围正确 | [RFC 8656 §3.1](https://www.rfc-editor.org/rfc/rfc8656.html#section-3.1)、[RFC 6062](https://www.rfc-editor.org/rfc/rfc6062.html) |
| UDP `connect()` | Linux 设置默认发送对端及接收来源限制，不进行 TCP 式网络握手；调用成功不证明对端可达 | [Linux connect(2) DESCRIPTION](https://man7.org/linux/man-pages/man2/connect.2.html) |
| SO_REUSEPORT | 满足绑定条件后可分发到多个 Socket，不是广播复制；默认分流不保证单一流均分 | [Linux socket(7) SO_REUSEPORT / BPF reuseport](https://man7.org/linux/man-pages/man7/socket.7.html) |
| RSS/外层五元组 | 同一外层流可能落入同一队列，多个内层业务不自动变成多个硬件接收流；实际受网卡、驱动和软件分流配置影响 | [Linux Scaling 文档 RSS/RPS](https://docs.kernel.org/networking/scaling.html) |
| 批量 I/O、GSO/GRO | 一次系统调用可读取多个报文；分段/聚合减少逐包开销，能力依赖系统与数据路径；现文没有将其归因为 connected UDP 或多开 Socket | [recvmmsg(2)](https://man7.org/linux/man-pages/man2/recvmmsg.2.html)、[Linux Segmentation Offloads](https://docs.kernel.org/networking/segmentation-offloads.html) |
| MTU 排查 | 小探测成功不充分证明大包传输正常，检查封装、MTU 与路径 MTU 是合理排查项，并未作过强根因断言 | [RFC 8085 §3.2](https://www.rfc-editor.org/rfc/rfc8085.html#section-3.2) |
| UDP 隧道拥塞控制 | 已保留载荷拥塞受控、外层流量与载荷量相对应的条件；缺少控制或外层独立放大发送时另行处理，不能一概追加或取消外层控制 | [RFC 8085 §3.1.11](https://www.rfc-editor.org/rfc/rfc8085.html#section-3.1.11) |

## 覆盖与未验证项

- 逐节阅读了全文，并重点复核第一至四部分、第六至七部分的机制、因果和系统 API 语义。
- 第五部分只做与上述机制的一致性检查：它把控制协调、加密数据、直接路径和中继分开，未见与通用机制直接冲突的推导。没有据此声称已独立验证所有 Tailscale 版本、平台行为、端口默认值或最新产品配置；这些需要产品专项文档与固定版本源码核查。
- 没有搭建真实 NAT/防火墙拓扑，没有复现某个客户端 API 或内核版本的性能，没有测量打洞成功率或吞吐量。
- 文献一致性不等于实机证明。内容检查、构建和浏览器检查也不能证明协议判断真实；它们应在事实修正完成后验证发布完整性。

## SVG 与文末总结完成后的最终复核

本次重新通读最终正文、16 张 SVG 的文字与结构，以及文末新增总结。此前已修正的映射/过滤区分、UDP 探测前提、STUN/ICE/TURN 分工、UDP Socket、RSS、批量处理、多路径和隧道拥塞条件仍成立。检查没有发现需要推翻全文主线的新机制错误。

新增发现与修正：

1. TCP 同时打开 SVG 把四条消息画成水平、依次到达的箭头，未实际体现正文所说的 SYN 交错。已将两组消息改为沿时间轴向下交叉的传输箭头，保证双方在收到对方 SYN 前均已主动发送 SYN；保留 RFC 9293 §3.5 Figure 7 的 SYN/SYN+ACK 四条消息简化，不添加必需的额外 ACK 轮次。依据：https://www.rfc-editor.org/rfc/rfc9293.html#section-3.5 。
2. 地址观察图补充上方本地端点、下方外部端点的标签；正文“表中的地址”同步改为“图中的地址”，避免 SVG 替换后指代失配。
3. 小结将“映射可复用”改为“映射适用于对端”，避免把 EIM 误写成所有 UDP 打洞的必要条件。将端口结论明确为“端口号本身不代表带宽或并发上限”，不否认端口变化可能通过 RSS、过滤、QoS 或路径选择间接影响实测性能。
4. 新增 WebRTC 总结经 RFC 8831 §1、§5 及 RFC 8835 复核：媒体 SRTP 与数据通道 SCTP over DTLS 可共用 UDP 端口；它们不是把所有业务统一封装成 TCP 的 IP 隧道。依据：https://www.rfc-editor.org/rfc/rfc8831.html 、https://www.rfc-editor.org/rfc/rfc8835.html 。

仍未进行真实 NAT 组合、抓包或性能实验；发布与视觉检查不替代协议证据。
