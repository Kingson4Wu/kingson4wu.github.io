# Tailscale 连接机制事实复核

核验日期：2026-11-02。核验对象：`content/zh/posts/20261102-nat-traversal-p2p-tailscale.md` 中的 Tailscale 相关描述。

本记录区分官方概念说明、固定版本实现与社区实验；未运行实机网络实验。源码主要使用稳定版本 `v1.104.4`，不把当前 `main` 的行为推定为所有发布版本的行为。结论只用于修正文章，不构成完整产品说明。

## 优先修正的概念问题

### 1. 建连流程：先直连失败、再接入中继的图不符合文档描述

**判定：主流程错误，附加“概念流程”声明不足以修复。**

官方文档概括典型未知路径借助 DERP 交换信息及提供初始路径，随后升级为直接连接或可用 Peer Relay，否则保持 DERP。不能由此推导出“DERP 业务通信完成后才开始 UDP 探测”的严格顺序：固定版本 `endpoint.send` 在发送 DERP 业务数据前已触发 `sendDiscoPingsLocked`，其中异步发送直接探测并排入经 DERP 的 CallMeMaybe。正文与图应表达协商/初始承载和直接探测可并行。

来源：[Connection types — How Tailscale establishes connections](https://tailscale.com/docs/reference/connection-types#how-tailscale-establishes-connections)。定位：该节的 numbered sequence，以及紧随其后的 DERP 初始路径说明。

边界：不要把这段概念文档改写成“每一条应用连接每次都重新经 DERP”。固定版本源码 `endpoint.addrForSendLocked` 对仍可信的 `bestAddr` 直接返回 UDP 端点；路径过期时也可能同时发送到旧 UDP 端点及 DERP。应用的 TCP 连接与 Tailscale 对等节点路径不是一一对应。

源码：[endpoint.go, v1.104.4, addrForSendLocked / send](https://github.com/tailscale/tailscale/blob/v1.104.4/wgengine/magicsock/endpoint.go#L635-L651)。`send` 位于约 L1107，负责发包时触发路径发现。

### 2. 控制面、DERP 与 DISCO 需要分开

**判定：控制面职责基本正确，但当前叙述遗漏实际路径协商承担者，容易把协调服务器当作唯一信令组件。**

控制面分发公钥、节点及策略信息；DISCO 是对等路径发现协议。DERP 除了转发加密 WireGuard 数据，也转发 DISCO 消息，因此直连成功后“不需要 DERP 转发业务数据”不能写成“不再需要任何 DERP 联系”。

来源：[DERP servers — DERP packets](https://tailscale.com/docs/reference/derp-servers#derp-packets)。定位：该节明确区分 DISCO packets 与 encrypted WireGuard packets。

补充源码：[magicsock.go, v1.104.4](https://github.com/tailscale/tailscale/blob/v1.104.4/wgengine/magicsock/magicsock.go)。定位：`sendDiscoMessage`、`CallMeMaybe` 分支；该分支要求消息经 DERP 到达，并匹配发现密钥与网络映射。

来源：[How Tailscale works — The control plane: key exchange and coordination](https://tailscale.com/blog/how-tailscale-works#the-control-plane-key-exchange-and-coordination)。定位：节点生成密钥、上传公钥、下载对等节点公钥、分发策略的说明。该文章发布较早，只用于稳定的职责划分，不用于新中继能力。

### 3. Peer Relay 与 DERP 的差异不止由谁运维

**判定：描述过窄，网络适用条件缺失。**

Peer Relay 使用配置的 UDP 服务端口，两个客户端都需能以 UDP 到达该中继。它能绕过两客户端之间的直连困难，但不能据此宣称完全禁止 UDP 的客户端也可使用 Peer Relay。DERP 则通常通过 TCP/TLS 443 为此类网络提供另一种路径。

来源：[Peer Relays — How it works、Prerequisites、Security and access control](https://tailscale.com/docs/features/peer-relay)。定位：服务端监听指定 UDP 端口；客户端要求、`tailscale.com/cap/relay` capability 和端口可达性。

该文档当前要求中继与客户端至少 v1.86；中继宿主不支持 iOS、Apple TV、Android，客户端没有同样限制。使用能力需专门 grant；不能把普通 Tailnet 成员身份或普通网络 grant 等同于中继权限。按该页当前说明，分配 relay binding 的权限由 capability grant 控制，不必另加到中继设备的网络 grant。

以上产品条件具有时间敏感性。正文可只保留版本和权限检查的提示，避免完整复制配置手册。

### 4. DERP 不是“官方中继”的同义词

**判定：正文已部分修正，技术列表和概念表仍需同步。**

DERP 是 Tailscale 使用的中继协议/服务，默认网络由 Tailscale 运营，也支持自行部署。中继转发的 WireGuard 载荷保持端到端加密；自建与官方 DERP 不能据此查看业务明文。

来源：[DERP servers — Custom DERP servers](https://tailscale.com/docs/reference/derp-servers#custom-derp-servers)。定位：自建 `cmd/derper` 及加密载荷限制。

源码：[derphttp_client.go, v1.104.4](https://github.com/tailscale/tailscale/blob/v1.104.4/derp/derphttp/derphttp_client.go#L473-L560)。定位：默认 TLS/TCP 路径，以及 HTTP `Upgrade: DERP` 握手。正文写“经 TCP/TLS 443”比把整个转发协议称为普通 HTTPS 请求更精确。

## 诊断命令与地址

### 5. 默认 `tailscale ping` 成功不代表内层 IP 或 SSH 服务已验证

**判定：原文缺少关键边界。**

默认探测是 DISCO，主要确认 Tailscale 路径。`--tsmp` 经过 WireGuard，但绕过对端操作系统 IP 栈；`--icmp` 才进行 ICMP 层测试。最终仍需对目标服务做 SSH、HTTP 或 TCP 端口测试，才能判断监听、访问策略及主机防火墙是否允许应用通信。

来源：[Tailscale ping message types — DISCO、ICMP、TSMP](https://tailscale.com/docs/reference/ping-types)。定位：三种消息类型的解释。该页同时提供 DERP → Peer Relay → direct 的示例。

来源：[Troubleshoot TCP connection issues between two devices](https://tailscale.com/docs/reference/troubleshooting/network-configuration/tcp-connection-two-devices)。定位：不同 ping 层级与 TCP/主机网络问题的诊断步骤。

### 6. 局域网示例输出中的括号地址错误

**判定：明确的输出语义错误。**

`pong from device-b (192.168.1.20) via 192.168.1.20:41641` 不适合作为直接 ping Tailnet 节点的示例。括号内通常是节点的 Tailscale IP；`via` 后面才是外层实际端点。应改为类似 `pong from device-b (100.64.0.2) via 192.168.1.20:41641 in 1ms`，并说明为示意输出。

源码：[ping.go, v1.104.4, output formatting](https://github.com/tailscale/tailscale/blob/v1.104.4/cmd/tailscale/cli/ping.go#L149-L175)。定位：分别读取 `pr.Endpoint`、`pr.NodeIP` 后输出。

推断边界：RFC1918 端点说明 UDP 数据发往私网地址，但单凭地址不能严格证明同一二层 LAN，企业路由网络也可能提供私网可达性；公网端点也不证明报文一定离开本地出口，例如 NAT hairpin。可在本文给定拓扑下解释 LAN 路径，避免普遍化。

### 7. `netcheck` 不是任意对等节点的连通性证明

**判定：当前文章已有概括边界，建议再明确字段语义。**

`UDP: true` 的实现含义是有一次 UDP STUN 往返成功，并不证明所有目的地址、任意端口、特定对端的 UDP 都可达。`MappingVariesByDestIP` 在该版本实现中比较 IPv4 STUN 返回的完整 IP:port，不是只比较公网 IP；false 也不是完整 NAT 行为认证。

源码：[netcheck.go, v1.104.4, Report](https://github.com/tailscale/tailscale/blob/v1.104.4/net/netcheck/netcheck.go#L90-L105)。定位：字段注释；同文件 `addNodeLatency` 附近对 IPv4 观察端点进行 `AddrPort` 比较。

来源：[Tailscale CLI — netcheck](https://tailscale.com/docs/reference/tailscale-cli#netcheck)。定位：报告字段、空字段未测得及当前物理网络的说明。该文档对 NAT 分类的概括较粗，细节以源码语义为准。

## 端口、Socket 与性能

### 8. 41641 不能写成每个平台、每种发行方式的统一默认

**判定：官方概念文档如此概括，但实现和打包配置存在需要说明的差异。**

稳定版本 `v1.104.4` 的独立 `tailscaled`：若设置 `PORT` 则使用该值；否则 Windows 默认 41641，其余平台返回 0，交给内核自动选择。Linux 的官方 `tailscaled.defaults` 另设 `PORT="41641"`。因此“常见默认/打包默认是 41641”可以保留，不能由此推导所有 macOS GUI、容器或裸跑进程都固定绑定此端口。

源码：[tailscaled.go, v1.104.4, defaultPort](https://github.com/tailscale/tailscale/blob/v1.104.4/cmd/tailscaled/tailscaled.go#L107-L122)、[tailscaled.defaults, v1.104.4](https://github.com/tailscale/tailscale/blob/v1.104.4/cmd/tailscaled/tailscaled.defaults#L1-L6)。

来源：[tailscaled daemon — Platform differences、Flags to tailscaled](https://tailscale.com/docs/reference/tailscaled)。定位：macOS GUI 的守护进程不是独立 `tailscaled`，以及 `--port=0` 表示自动选择。

来源：[Firewall ports — Confirm or change the UDP port](https://tailscale.com/docs/reference/faq/firewall-ports#confirm-or-change-the-udp-port)。定位：默认端口可配置，写防火墙规则前应确认实际值。对外公网映射还可能由 NAT 改写。

### 9. Connected UDP 的讨论不能当作已发布性能机制

**判定：目前文章已经降格为社区实验，但保留的目的列表仍混合了不同机制，宜删除或压缩。**

Issue #21602 是社区提交的性能实验/建议，不能单独证明产品已实施其方案，更不能证明 connected Socket 导致 GSO/GRO 能力。UDP connect 语义与分段/聚合卸载是不同层次。若文章不分析具体补丁，建议删去有关产品实现的猜测，保留一般 OS 层知识和已发布优化。

来源：[Issue #21602](https://github.com/tailscale/tailscale/issues/21602)。定位：议题状态、报告者实验条件与补丁/测试说明。本次没有独立复现其性能数字，不建议引用数字。

固定版本佐证：[magicsock.go, v1.104.4, Conn](https://github.com/tailscale/tailscale/blob/v1.104.4/wgengine/magicsock/magicsock.go#L189-L193) 具有 IPv4/IPv6 UDP 收发对象；[rebinding_conn.go](https://github.com/tailscale/tailscale/blob/v1.104.4/wgengine/magicsock/rebinding_conn.go) 根据能力升级为 batching conn。这足以说明“一个默认端口”不能决定整个进程只有一个 Socket，但不能仅凭这两处断言产品绝无其他 connected Socket。

### 10. GSO/GRO 优化不要求按业务增加 Socket

**判定：需要把已证实优化与猜测分开。**

官方性能文章解释批量 I/O、TUN 分段/合并与 UDP 收发，重点是减少系统调用及逐包处理开销；多 Socket 不是这些机制自动生效的先决条件。正文应围绕已确认机制解释，且标明 Linux/内核及功能边界。

来源：[Improving Tailscale Performance: Enhancing Userspace with Kernel Interfaces](https://tailscale.com/blog/throughput-improvements)。定位：Batching I/O、TUN TSO/GRO 和 UDP socket 数据路径。

来源：[Performance best practices — Linux optimizations for subnet routers and exit nodes](https://tailscale.com/docs/reference/best-practices/performance#linux-optimizations-for-subnet-routers-and-exit-nodes)。定位：特定转发场景的版本、内核和设备卸载配置；不要把该配置普遍推荐到所有 macOS/Windows 端点。

## 虚拟网络与安全边界

### 11. 虚拟网卡是常见路径，不是全部运行模式的必要条件

**判定：原文作为概念例子可保留，但应加运行模式限定。**

普通系统集成模式通过虚拟网络接口处理内层 IP 流量；userspace networking mode 则可在无 TUN 权限环境中运行，向应用提供 SOCKS5/HTTP 代理，不能说每台 Tailscale 节点都必须创建内核虚拟网卡。

来源：[Userspace networking mode](https://tailscale.com/docs/concepts/userspace-networking)。定位：开头对无 TUN 环境的解释、Start Tailscale in userspace networking mode。

### 12. “中继看不到明文”的结论需要限定终止端

**判定：针对单纯 Peer Relay/DERP 转发是正确的，不应泛化到子网路由器或出口节点。**

纯中继转发双方间已加密的载荷；子网路由器、出口节点则是其 WireGuard 隧道的一端，可能解密后向非 Tailnet 目的地转发。应避免让读者以为所有路径中的基础设施节点都只见密文。同一 Tailnet 也不自动授予任意业务访问权限，仍受策略及对端服务约束。

来源：[How Tailscale works — control plane](https://tailscale.com/blog/how-tailscale-works#the-control-plane-key-exchange-and-coordination)。定位：加密端点与 subnet route 例外。

## 修改优先级

1. **必须改正文及图**：DERP 初始路径与升级过程；将“一个应用连接”同“对等节点路径”分开。
2. **必须补诊断层级**：默认 DISCO、TSMP、ICMP、实际服务验证；修正 LAN 示例括号地址。
3. **必须补网络条件**：Peer Relay 为 UDP，不是完全禁 UDP 的替代方案；专用 capability grant 与双边可达性。
4. **必须去掉未证实产品推断**：connected UDP Socket 与 GSO/GRO 的因果暗示。
5. **修正实现范围**：41641 是常见配置而非跨平台不变量；虚拟网卡/运行模式差异。
6. **统一术语**：DERP 协议/默认中继网络、自建服务、控制面/DISCO 的角色、中继与隧道终止端的差别。

## 正文重写后的二次核验

对重写正文第四至六部分再次只读核对，收紧了 DERP 与直接探测的时序：它们可能并行，不能写成等待中继业务通信完成后才开始直连探测。依据：[endpoint.send](https://github.com/tailscale/tailscale/blob/v1.104.4/wgengine/magicsock/endpoint.go#L1107-L1130) 和 [sendDiscoPingsLocked](https://github.com/tailscale/tailscale/blob/v1.104.4/wgengine/magicsock/endpoint.go#L1423-L1461)。其余此前标出的产品机制、诊断、端口与实现范围问题已在正文对应位置修正；这不替代实机验证。
