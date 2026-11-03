# NAT/P2P 文章：Tailscale 全节独立复核

日期：2026-11-03。对象：`content/zh/posts/20261102-nat-traversal-p2p-tailscale.md` 第五部分及其与通用穿透模型的关系。本记录对应本轮复核开始时的正文；不修改文章或 `claims.json`。

核对官方文档与固定版本 `v1.104.4` 源码。未进行节点连接、NAT 拓扑或性能实测，命令示例按格式与语义核查。以下区分应修的范围问题与已经准确的解释，不以“未找到问题”证明所有平台完全相同。

## 一、建议修正的三处问题

### 1. 把“需要可用路径”写成“必须知道对端的直接地址”

**原句**：

> 实际传输时，Tailscale 还要知道对方当前可达的局域网或外部地址。

> 普通系统网络模式下，这些 IP 数据包经过虚拟接口交给 Tailscale，再由它加密并发送到 B 当前使用的实际地址。

紧接着的图也将外层画成 A 实际地址直接到 B 实际地址，未标明只绘制直连。

**判定：范围不足，第一句对纯中继路径过强。** 使用直接路径确实需要一个可用对端端点；使用 DERP 时，客户端可以按对端身份与 DERP 路由转发，不要求已找到 B 可达的直接 IP:port。普通系统网络模式只说明虚拟接口如何接收内层数据，并不意味着实际路径一定直连。后面再介绍 DERP，不能自动限定此处的绝对句。

**建议替代**：

> 虚拟 IP 标识目标节点，底层还需要一条到达它的可用路径。直连时使用对端的实际端点；经中继时，则由可达中继按相应转发信息把密文交给对端。

> 在普通系统网络模式下，内层 IP 数据包经虚拟接口交给 Tailscale 加密，再沿选定的直接或中继路径送到 B，最终由 B 解密处理。

图若保留 A→B 的单条外层路径，应将引导语明确为“直接路径的封装过程”，或在图中分别表示直接 UDP 与中继分支。

**依据**：

- [Connection types](https://tailscale.com/docs/reference/connection-types)：三种路径的定义，以及 How Tailscale establishes connections；直接 UDP 与经 DERP/Peer Relay 是不同路径。
- [DERP packets](https://tailscale.com/docs/reference/derp-servers#derp-packets)：DERP 能转发发现消息与加密 WireGuard 载荷。
- [endpoint.go, v1.104.4](https://github.com/tailscale/tailscale/blob/v1.104.4/wgengine/magicsock/endpoint.go)：`addrForSendLocked` 与 `send` 使用 UDP 端点、DERP 区域及必要的 fallback DERP route 分别选择外层传输；不是所有发送都以直接对端端点为目标。

### 2. `MappingVariesByDestIP` 缺少 IPv4 适用范围

**原句**：

> `MappingVariesByDestIP`：访问不同 STUN 目标时，观察到的外部 IP 或端口是否变化。

**判定：已正确说明 IP:port 变化，但地址族范围不完整。** 固定版本的字段只比较 IPv4 STUN 观察结果；IPv6 分支明确留有未实现同类统计的 TODO。现文紧邻 IPv4/IPv6 报告说明，容易被当作对两个地址族都成立的指标。

**建议替代**：

> `MappingVariesByDestIP`：在 IPv4 STUN 探测中，访问不同服务器时观察到的外部 IP 或端口是否变化。

不应由 `false` 推导任意对端都可直连，也不能将未测得的值当作 `false`。

**依据**：

- [netcheck.go, v1.104.4](https://github.com/tailscale/tailscale/blob/v1.104.4/net/netcheck/netcheck.go#L90-L105)：`Report` 字段注释限定 IPv4。
- 同文件 `reportState.addNodeLatency`，约 L686–734：IPv4 分支比较完整 `AddrPort`，IPv6 分支未设置该字段。
- [CLI — netcheck](https://tailscale.com/docs/reference/tailscale-cli#netcheck)：报告用途与字段。该文档对 NAT 的口语概括不够精确，详细范围以源码为依据。

### 3. 不能把控制连接与 DERP 合并概括为同一端口行为

**原句**：

> STUN 通常访问服务端 UDP 3478，控制连接和 DERP 通常访问 TCP 443，Peer Relay 则使用配置的 UDP 端口。

**判定：对控制连接的概括过窄。** DERP 默认 TCP/TLS 443 可保留；但当前官方防火墙文档及固定版本控制连接实现包含 TCP 80 快速路径与 443 兼容回退。控制协议使用 Noise，加密不能仅根据端口 80/443 判断。`通常 443` 将两种组件合并，作为防火墙诊断依据不够可靠。

**建议替代**：

> Tailscale 的 STUN 探测通常访问服务端 UDP 3478，DERP 通常使用 TCP/TLS 443，Peer Relay 使用配置的 UDP 端口。控制连接还可能使用 TCP 80 上的加密控制协议或 TCP 443，具体取决于实现和运行条件。

如果不准备解释 Noise 的传输，可缩成“控制连接的 80/443 使用方式应按对应版本文档核对”，避免把 80 等同明文业务。

**依据**：

- [Firewall ports](https://tailscale.com/docs/reference/faq/firewall-ports)：How do I open the firewall ports for Tailscale 段落既列 443，也说明控制连接可优先使用 TCP 80 的加密传输，失败后使用 HTTPS 443。
- [control/controlhttp/client.go, v1.104.4](https://github.com/tailscale/tailscale/blob/v1.104.4/control/controlhttp/client.go)：`Dial` 注释、`dialHostOpt`（约 L238–305）构造 80/443 两个 Upgrade URL，并在 HTTP Upgrade 后承载 Noise；强制 TLS 配置和网络条件会改变选择。
- [derphttp_client.go, v1.104.4](https://github.com/tailscale/tailscale/blob/v1.104.4/derp/derphttp/derphttp_client.go)：默认 HTTPS 443、TLS 与 `Upgrade: DERP`，支持将 DERP 与控制连接分别描述。

## 二、已经准确、无需推翻的部分

### 连接建立与路径复用

正文将未知路径发现表述为 DERP 协商/初始通信与直接探测可配合进行，而不是先等所有直连失败才接入 DERP；也说明可信直接路径可以复用。图与这部分正文一致。

核对位置：[Connection types — How Tailscale establishes connections](https://tailscale.com/docs/reference/connection-types#how-tailscale-establishes-connections)及固定版本 [`endpoint.send`、`addrForSendLocked`、`sendDiscoPingsLocked`](https://github.com/tailscale/tailscale/blob/v1.104.4/wgengine/magicsock/endpoint.go)。后者在发送过程中触发异步发现，并可在路径老化时同时使用旧 UDP 与 DERP。不能将概念文档中的顺序再解释成每条应用 TCP 连接必须重新经过 DERP。

### Peer Relay 与 DERP

正文已经保留双端 UDP 可达、指定服务端口、能力授权及中继资源条件，正确区分其与默认 TCP/TLS DERP 的网络适用性。普通 Tailnet 成员身份不替代 relay grant，完全禁 UDP 也不能靠 Peer Relay 解决。

核对位置：[Peer Relay — How it works、Prerequisites、Security and access control](https://tailscale.com/docs/features/peer-relay)。当前文档还限定最低版本和中继宿主平台；正文没有展开配置操作，因此不要求复制全部前提，只需保持“指定可用设备并正确配置”的范围。

### 控制面、公钥与加密边界

控制面分发公钥/节点/策略，实际载荷由端点加密处理；DERP/Peer Relay 不解密双方 WireGuard 载荷。出口/子网路由节点则终止相应隧道再转发，正文已区分。

核对位置：[How Tailscale works — control plane](https://tailscale.com/blog/how-tailscale-works#the-control-plane-key-exchange-and-coordination)及其 subnet route 例外；[WireGuard Protocol](https://www.wireguard.com/protocol/)的数据消息与重放保护；[DERP packets](https://tailscale.com/docs/reference/derp-servers#derp-packets)。对元数据可见性的说明属于中继必须处理外层连接与传输量的范围，不是宣称中继能读业务明文。

### 用户态网络模式

正文将普通系统模式作为虚拟接口路径，并补充无 TUN 环境的 SOCKS5/HTTP 访问，未宣称全部客户端必须有内核虚拟网卡。

核对位置：[Userspace networking mode](https://tailscale.com/docs/concepts/userspace-networking)，Start / Configure your application。

### 探测层次和输出

默认 DISCO、TSMP 经过 WireGuard 但绕过目标操作系统 IP 栈、ICMP 与业务服务分别测试的范围正确。示意输出的括号地址使用 Tailnet IP，`via` 使用实际端点/中继类型，格式合理；没有把私网 `via` 一概当作同二层网络。

核对位置：[Ping message types](https://tailscale.com/docs/reference/ping-types)；固定版本 [CLI ping formatting](https://github.com/tailscale/tailscale/blob/v1.104.4/cmd/tailscale/cli/ping.go#L149-L175)。未进行这些示例的现场复现，时延数值仅按“示意输出”理解。

### UDP 可用性和端口

在普通原生客户端 `netcheck` 语境下，将 `UDP: true` 解释为完成过 STUN 往返，比文档中“UDP 被启用”的粗略说明更准确。特殊仅 HTTP 构建不是这段 CLI 场景的讨论对象。41641 已写为常见配置，并区分实际本地端口、公网 NAT 映射及服务端目标端口，没有跨平台常量错误。

核对位置：[`netcheck.Report`](https://github.com/tailscale/tailscale/blob/v1.104.4/net/netcheck/netcheck.go#L90-L105)；[`tailscaled.defaultPort`](https://github.com/tailscale/tailscale/blob/v1.104.4/cmd/tailscaled/tailscaled.go#L107-L122)与 [Linux packaged defaults](https://github.com/tailscale/tailscale/blob/v1.104.4/cmd/tailscaled/tailscaled.defaults#L1-L6)。

## 三、覆盖与未验证项

已逐段覆盖第五部分的内外地址、图、选路与中继、身份与加密、用户态模式、UDP 承载内层 TCP、四层诊断、netcheck 字段和端口方向，并检查与前面“一次 UDP 探测不证明其他服务可用”的说明是否矛盾。除上列三处边界问题外，未发现可证实的新实质错误。

没有做实机协议抓包、不同 NAT 组合的成功率测试、性能测试，也没有证明所有客户端版本采用完全一致实现。第六、七部分的操作系统及通用协议细节由另一专项覆盖，本记录不重复背书。

## 图文完成后的接收路径范围修正

最终全文复核发现，普通系统网络模式不自动意味着 SSH 由系统 sshd 接收：启用 Tailscale SSH 后，tailscaled 会接管发往 Tailscale IP 端口 22 的流量。因此，正文与 WireGuard 封装图之前明确以“系统 SSH 服务、未启用 Tailscale SSH 接管”为例，并增加接管方式的一句说明。参考资料统一放在文末。

依据：[Tailscale SSH — Advertise SSH on the host](https://tailscale.com/docs/features/tailscale-ssh)：`tailscale set --ssh` 配置 tailscaled 拦截此类流量。该限定不改变内外层 TCP/UDP、加密边界或直连/中继解释。
