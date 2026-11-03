# NAT 穿透文章：协议与操作系统语义复核

核验日期：2026-11-02。对象：`content/zh/posts/20261102-nat-traversal-p2p-tailscale.md`。Tailscale 专项证据另见 `20261102-tailscale-connectivity-fact-check.md`。

本次逐节核对原文，采用 IETF RFC、Linux man-pages、Linux 内核文档和 WireGuard 官方说明。修订保留了 NAT、UDP/TCP 打洞、标准穿透工具、隧道安全、Socket 并发、多路径、诊断及系统设计的主题范围，删除重复论证，将不能证实的产品实现推断降格或移除。以下记录区分明确错误、容易误读的简化与新增的必要边界。未做真实 NAT 拓扑、吞吐量或操作系统组合实验；示例地址、命令输出和报文图均不是实测证据。

## 1. 地址转换与过滤

**原文问题**：把 NAT 概括成内外网转换，没有明确示例主要属于 NAPT；“NAT 阻止外部主动连接”容易被读成 NAT 本身必定实施严格入站过滤。映射定义大量使用“可能变化”，没有说明分类实际描述映射复用条件。

**修正**：限定 IPv4 NAPT 范围，分离转换与过滤；三种映射行为按同一协议、同一内部端点、有效映射的目标依赖条件说明，过滤按该内部端点的有效出站状态解释。外部映射不一定是全球可达公网地址，多层网络还会继续转换。

**依据与定位**：[RFC 4787 §4.1、§5](https://www.rfc-editor.org/rfc/rfc4787.html)，分别定义映射复用与三类过滤行为；§3 指出 Cone/Symmetric 分类的不足。[RFC 7857 §5–6](https://www.rfc-editor.org/rfc/rfc7857.html#section-5)明确映射和过滤的协议相关性。

## 2. 打洞的成功前提

**原文问题**：流程写成双方发包后 NAT 会放行，成功条件后置；“严格过滤”与失败并列，容易将 APDF 单独当作失败原因。

**修正**：基本示例显式假设 EIM 与其他必要 UDP 可达条件。解释 APDF 下出站包如何建立精确对端状态，以及首包被丢后重试成功的过程。严格同时发送不是必要条件。目标相关映射使 STUN/会合服务器观察端点不能直接复用，不能据简单流程承诺成功。

**依据与定位**：[RFC 5128 §3.3.1](https://www.rfc-editor.org/rfc/rfc5128.html#section-3.3.1)，不同 NAT 后的会合模型；[RFC 4787 §5](https://www.rfc-editor.org/rfc/rfc4787.html#section-5)，APDF 的此前出站条件。Tailscale 的[原理文章](https://tailscale.com/blog/how-nat-traversal-works) Mapping/Filtering 和 hard NAT 部分补充组合差异与概率探测，不引入其示例数字作为普遍成功率。

## 3. Socket 与映射的关系

**原文问题**：强调同一 Socket，但没有区分源 IP/端口保持与目标依赖；读者可能把同一个对象当作跨网络变化的映射保证。

**修正**：复用同一 Socket 是维持本地源端点的一种实现方法；路由改变源 IP、映射过期或目标依赖都仍可能使观察结果失效。没有发送者握手不等于不需要接收 Socket，也不等于一定要显式 bind。

**依据与定位**：[RFC 5128 §3.3](https://www.rfc-editor.org/rfc/rfc5128.html#section-3.3)，同一内部端点与映射行为；[Linux udp(7) DESCRIPTION](https://man7.org/linux/man-pages/man7/udp.7.html)，自动绑定与本地端点；[connect(2) DESCRIPTION](https://man7.org/linux/man-pages/man2/connect.2.html)，SOCK_DGRAM 默认目标与接收来源。

## 4. CGNAT、Hairpin 与 IPv6

**原文问题**：CGNAT 仅被描述成额外阻碍，缺少其并非 NAT 行为类型的边界；同局域网和公网端点推断过强；IPv6 与有状态过滤未交代。

**修正**：多层 NAT 不必然失败；实际依赖各层行为。公网映射可能 hairpin，私网地址也可能通过路由可达。IPv6 全球地址可能消除 IPv4 转换需求，但不消除入站策略。

**依据与定位**：[RFC 6888 §3 REQ-7](https://www.rfc-editor.org/rfc/rfc6888.html#section-3)，CGN 过滤建议；[RFC 5128 §3.3.2–3.3.3](https://www.rfc-editor.org/rfc/rfc5128.html#section-3.3.2)，同 NAT、多层 NAT 与 hairpin；[RFC 6092 §3.2.3](https://www.rfc-editor.org/rfc/rfc6092.html#section-3.2.3)，IPv6 UDP 有状态过滤。

## 5. STUN 与信令

**原文问题**：STUN 主要写成公网地址发现，容易被当作“公网地址查询”等价物；会合服务器被描述成必须统一负责观察、交换与打洞指令。

**修正**：STUN 也用于连通性检查与保活，但不是完整穿透方案。观察端点属于具体路径；地址发现、设备发现、信令和认证可以分别实现。

**依据与定位**：[RFC 8489 Abstract、§3](https://www.rfc-editor.org/rfc/rfc8489.html)，明确三个用途与工具定位。现行引用保留 RFC 8489 取代 5389 的关系。

## 6. ICE 与 TURN

**原文问题**：ICE 只列三类候选，未解释 peer-reflexive、候选对和提名；TURN 缺少两段传输的区别。

**修正**：补四类候选及 peer-reflexive 在检查时发现的边界。ICE 按地址对检查、选定，不承诺全局最快路径。区分 TURN 客户端到服务器可用 TCP/TLS，与基础 TURN 服务器到对端的 UDP allocation；TCP allocation 是单独扩展。中继不自动提供业务端到端加密。

**依据与定位**：[RFC 8445 §2、§5.1.1、§7–8](https://www.rfc-editor.org/rfc/rfc8445.html)，候选、检查、提名；[RFC 8656 §3.1、§15](https://www.rfc-editor.org/rfc/rfc8656.html#section-3.1)，传输与端到端载荷保护；[RFC 6062 Abstract](https://www.rfc-editor.org/rfc/rfc6062.html)，TCP allocations。

## 7. TCP 同时打开

**原文问题**：同时打开的图在双方 SYN、SYN+ACK 后又追加双方纯 ACK，容易使读者认为这是一轮必需步骤；“三次握手及同时打开”也容易混同具体报文序列。将 TCP 打洞推荐为 UDP 被禁的自然替代不充分。

**修正**：按现行 TCP 标准 Figure 7 绘制忽略重传的交错 SYN/SYN+ACK；以 RFC 图示状态转换为依据，不承诺所有抓包只会有四个报文。强调本地端点复用、TCP NAT 状态处理、网络允许目标和协议的额外前提。

**依据与定位**：[RFC 9293 §3.5 Figure 7](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.5)，同时打开状态转换；[RFC 5382 §4](https://www.rfc-editor.org/rfc/rfc5382.html#section-4)，NAT 对 TCP 连接的要求。本文未引用旧 NAT 兼容性调查数字作为当今成功率。

## 8. ICE-TCP 与协议独立性

**原文问题**：ICE-TCP 紧接同时打开，未说明其范围不止这一种；UDP 候选不能无条件推导 TCP 端点。

**修正**：ICE-TCP 区分 active、passive、S-O；不同配对采用不同建连方式。UDP/TCP 同号端口不是同一端点或映射；会合 TCP 连接与对等连接是不同 Socket，本地复用取决于系统支持。

**依据与定位**：[RFC 6544 §3、§5、Appendix B](https://www.rfc-editor.org/rfc/rfc6544.html#section-3)，三类候选、映射收集及实现考量；[RFC 7857 §5–6](https://www.rfc-editor.org/rfc/rfc7857.html#section-5)，默认协议相关映射/过滤。

## 9. 加密与可靠性

**原文问题**：区分打洞与加密的方向正确，但少了授权、隧道端点与业务终点的区别；“内层可靠性”可能被读成不受外层影响。

**修正**：补身份绑定、访问授权和中继元数据边界。WireGuard 提供认证加密、握手及防重放，不替业务实现可靠流。TCP 可在 UDP 隧道里重传，但外层丢包、拥塞及持续中断仍影响业务甚至使连接失败。出口/子网路由终止隧道，不等同于纯中继。

**依据与定位**：[WireGuard Protocol](https://www.wireguard.com/protocol/)，握手、数据消息、Nonce Reuse & Replay Attacks；[Known Limitations — TCP Mode](https://www.wireguard.com/known-limitations/#tcp-mode)，没有原生 TCP 隧道模式；[RFC 9293 §2.2](https://www.rfc-editor.org/rfc/rfc9293.html#section-2.2)，TCP 可靠有序字节流及错误；Tailscale 专项记录补充终止端差异。元数据边界来自外层传输端点和服务转发所必需的可见信息，不是宣称中继可解密业务。

## 10. 并发、RSS 与多 Socket

**原文问题**：一个 Socket 不等于业务串行是正确的，但将线程、异步、网卡多队列笼统列为并发能力，遗漏单流哈希、共享队列和锁争用，容易给出“天然多核”的印象。多 Socket 与批量 I/O 也混杂。

**修正**：区分业务并发、应用工作并行和内核收发串行环节。相同外层五元组可能落到一个接收队列；多线程/异步不会自动消除瓶颈。SO_REUSEPORT 依平台分发，通常不是向所有 Socket 复制同一个包；批量读取可以针对单个 Socket，不依赖增加 Socket。

**依据与定位**：[Linux scaling 文档 — RSS、RPS](https://docs.kernel.org/networking/scaling.html)，流哈希、队列、CPU 和保持流内顺序；[socket(7) SO_REUSEPORT / SO_ATTACH_REUSEPORT_EBPF](https://man7.org/linux/man-pages/man7/socket.7.html)，复用与分发；[recvmmsg(2) DESCRIPTION](https://man7.org/linux/man-pages/man2/recvmmsg.2.html)，一次调用批量收取同一 Socket 的消息。正文限定为 Linux 语义，不推广所有平台。

## 11. 多路径与拥塞控制

**原文问题**：多路径有机会提高吞吐量的方向正确，但“独立出口”不保证无后续共享瓶颈；可靠传输只谈重传容易漏掉拥塞控制，也可能走向无条件给 VPN 再加一套拥塞控制的反面错误。

**修正**：区分多 Socket、多候选、路径切换、业务分流与单连接聚合。路径可能共享瓶颈，调度、拥塞和乱序都有代价；不宣称 Tailscale 默认聚合链路。单独说明 UDP 应用与承载已拥塞控制 IP 流量的隧道具有不同设计要求。

**依据与定位**：[RFC 8684 §1](https://www.rfc-editor.org/rfc/rfc8684.html#section-1)，MPTCP 是专门的多路径协议扩展；[RFC 8085 §3.1、§3.1.11](https://www.rfc-editor.org/rfc/rfc8085.html#section-3.1.11)，UDP 拥塞指导及隧道流量分类；§3.2 报文大小/分片，支持补充 MTU 排查。

## 复核后的结论范围

正文中的协议例子明确写出成功前提；产品行为使用具体文档或固定版本实现佐证；运行结果仅作示意。静态检查和浏览器检查只能验证发布质量，不能证明 NAT 兼容性、现场网络连通性或性能。关键误读点另记入 `evals/claims.json`，约束后续修订时重新查看边界和来源。
