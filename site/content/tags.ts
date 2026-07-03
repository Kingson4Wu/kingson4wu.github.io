interface CurateTagsInput {
  title: string;
  body: string;
  rawTags: string[];
}

const maxTagsPerPost = 5;

const tagAliases = new Map<string, string>([
  ['ai', 'AI'],
  ['ai哲学', 'AI'],
  ['ai philosophy', 'AI'],
  ['ai工程化', 'AI'],
  ['ai编程', 'AI'],
  ['ai产品', 'AI'],
  ['ai创业', 'AI'],
  ['ai商业化', 'AI'],
  ['大模型应用', 'AI'],
  ['垂直ai', 'AI'],
  ['工业革命', 'AI'],
  ['结构性问题', 'AI'],
  ['structural-issues', 'AI'],
  ['ai-agent', 'Agent'],
  ['agent', 'Agent'],
  ['agent-runtime', 'Agent'],
  ['browser-automation', 'Agent'],
  ['web-browser', 'Agent'],
  ['cdp', 'Agent'],
  ['playwright', 'Agent'],
  ['openai', 'Agent'],
  ['anthropic', 'Agent'],
  ['cli', 'Agent'],
  ['sdk', 'Agent'],
  ['llm', 'LLM'],
  ['大模型', 'LLM'],
  ['大语言模型', 'LLM'],
  ['inference', 'LLM'],
  ['推理引擎', 'LLM'],
  ['解码器约束', 'LLM'],
  ['多语言', 'LLM'],
  ['skill', 'Skill'],
  ['skills', 'Skill'],
  ['runtime', 'Skill'],
  ['mcp', 'MCP'],
  ['rag', 'RAG'],
  ['prompt', 'Prompt Engineering'],
  ['prompt工程', 'Prompt Engineering'],
  ['提示词工程', 'Prompt Engineering'],
  ['orchestration', 'Agent'],
  ['functioncalling', 'Agent'],
  ['工具调用', 'Agent'],
  ['langchain', 'Agent'],
  ['deep-learning', 'Deep Learning'],
  ['深度学习', 'Deep Learning'],
  ['深度学习基础', 'Deep Learning'],
  ['transformer', 'Deep Learning'],
  ['embedding', 'Deep Learning'],
  ['attention', 'Deep Learning'],
  ['multi-head', 'Deep Learning'],
  ['ffn', 'Deep Learning'],
  ['rnn', 'Deep Learning'],
  ['lstm', 'Deep Learning'],
  ['cnn', 'Deep Learning'],
  ['softmax', 'Deep Learning'],
  ['layernorm', 'Deep Learning'],
  ['fine-tuning', 'Deep Learning'],
  ['knowledge-distillation', 'Deep Learning'],
  ['模型微调', 'Deep Learning'],
  ['模型蒸馏', 'Deep Learning'],
  ['math', 'Math'],
  ['数学', 'Math'],
  ['概率与信息论', 'Math'],
  ['线性代数', 'Math'],
  ['微积分', 'Math'],
  ['交叉熵', 'Math'],
  ['余弦相似度', 'Math'],
  ['链式法则', 'Math'],
  ['反向传播', 'Math'],
  ['梯度消失', 'Math'],
  ['梯度爆炸', 'Math'],
  ['algorithm', 'Algorithms'],
  ['算法', 'Algorithms'],
  ['leetcode', 'Algorithms'],
  ['bloom filter', 'Algorithms'],
  ['前缀树', 'Algorithms'],
  ['architecture', 'Architecture'],
  ['架构', 'Architecture'],
  ['技术架构', 'Architecture'],
  ['业务方案', 'Architecture'],
  ['方案设计', 'Architecture'],
  ['服务架构', 'Architecture'],
  ['聚合层', 'Architecture'],
  ['多模态架构', 'Architecture'],
  ['系统思维', 'Architecture'],
  ['ai系统思维', 'Architecture'],
  ['重构', 'Architecture'],
  ['抽象', 'Architecture'],
  ['状态机', 'Architecture'],
  ['fsm', 'Architecture'],
  ['uml', 'Architecture'],
  ['distributed-systems', 'Distributed Systems'],
  ['distributed systems', 'Distributed Systems'],
  ['distributed', 'Distributed Systems'],
  ['分布式', 'Distributed Systems'],
  ['分布式技术', 'Distributed Systems'],
  ['分布式事务', 'Distributed Systems'],
  ['分布式锁', 'Distributed Systems'],
  ['一致性', 'Distributed Systems'],
  ['rpc', 'Distributed Systems'],
  ['grpc', 'Distributed Systems'],
  ['raft', 'Distributed Systems'],
  ['quorum', 'Distributed Systems'],
  ['consul', 'Distributed Systems'],
  ['zookeeper', 'Distributed Systems'],
  ['service discovery', 'Distributed Systems'],
  ['服务发现', 'Distributed Systems'],
  ['seata', 'Distributed Systems'],
  ['tcc', 'Distributed Systems'],
  ['saga', 'Distributed Systems'],
  ['xa', 'Distributed Systems'],
  ['cqrs', 'Distributed Systems'],
  ['事件溯源', 'Distributed Systems'],
  ['事件通知', 'Distributed Systems'],
  ['sidecar', 'Distributed Systems'],
  ['容灾', 'Reliability'],
  ['sre', 'Reliability'],
  ['ha', 'Reliability'],
  ['mha', 'Reliability'],
  ['降级', 'Reliability'],
  ['限流', 'Reliability'],
  ['失败重试', 'Reliability'],
  ['监控告警', 'Reliability'],
  ['脑裂', 'Reliability'],
  ['上线', 'Reliability'],
  ['mysql', 'Database'],
  ['redis', 'Database'],
  ['database', 'Database'],
  ['数据库', 'Database'],
  ['tendis', 'Database'],
  ['elasticsearch', 'Database'],
  ['canal', 'Database'],
  ['云数据库', 'Database'],
  ['云原生', 'Database'],
  ['事务', 'Database'],
  ['数据一致性', 'Database'],
  ['数据迁移', 'Database'],
  ['历史月表', 'Database'],
  ['缓存', 'Database'],
  ['榜单', 'Database'],
  ['幂等', 'Reliability'],
  ['接口回调', 'Security'],
  ['接口安全', 'Security'],
  ['非对称加密', 'Security'],
  ['单元测试', 'Testing'],
  ['unit-test', 'Testing'],
  ['tcp', 'Networking'],
  ['tcp_nodelay', 'Networking'],
  ['time_wait', 'Networking'],
  ['close_wait', 'Networking'],
  ['closed', 'Networking'],
  ['http', 'Networking'],
  ['http/2', 'Networking'],
  ['http/3', 'Networking'],
  ['https', 'Networking'],
  ['cdn', 'Networking'],
  ['dns', 'Networking'],
  ['ip', 'Networking'],
  ['ipv6', 'Networking'],
  ['vpn', 'Networking'],
  ['socks5', 'Networking'],
  ['udp', 'Networking'],
  ['uds', 'Networking'],
  ['nio', 'Networking'],
  ['keepalive', 'Networking'],
  ['长连接', 'Networking'],
  ['公网ip', 'Networking'],
  ['家庭网络', 'Networking'],
  ['内网穿透', 'Networking'],
  ['正向代理', 'Networking'],
  ['反向代理', 'Networking'],
  ['域名', 'Networking'],
  ['域名注册商', 'Networking'],
  ['域名注册局', 'Networking'],
  ['跨域', 'Networking'],
  ['断点续传', 'Networking'],
  ['anycast', 'Networking'],
  ['push', 'Networking'],
  ['直播', 'Media'],
  ['流媒体', 'Media'],
  ['rtmp', 'Media'],
  ['http-flv', 'Media'],
  ['hls', 'Media'],
  ['rtc', 'Media'],
  ['ffmpeg', 'Media'],
  ['java', 'Java'],
  ['java9', 'Java'],
  ['java11', 'Java'],
  ['jvm', 'Java'],
  ['spring-mvc', 'Java'],
  ['tomcat', 'Java'],
  ['netty', 'Java'],
  ['go', 'Go'],
  ['golang', 'Go'],
  ['rust', 'Rust'],
  ['lifetime', 'Rust'],
  ['lifetimes', 'Rust'],
  ['生命周期', 'Rust'],
  ['python', 'Python'],
  ['python 运行原理', 'Python'],
  ['fastapi', 'Python'],
  ['uvicorn', 'Python'],
  ['program', 'Programming Languages'],
  ['programming', 'Programming Languages'],
  ['language-design', 'Programming Languages'],
  ['编程语言', 'Programming Languages'],
  ['动态库', 'Programming Languages'],
  ['jni', 'Programming Languages'],
  ['ffi', 'Programming Languages'],
  ['book', 'Reading'],
  ['it-book', 'Reading'],
  ['读书', 'Reading'],
  ['job', 'Career'],
  ['职场', 'Career'],
  ['团队管理', 'Career'],
  ['会议', 'Career'],
  ['效率', 'Career'],
  ['开发效率', 'Career'],
  ['产品策略', 'Career'],
  ['scrum', 'Career'],
  ['life', 'Life'],
  ['生活哲学', 'Life'],
  ['学习法', 'Life'],
  ['finance', 'Finance'],
  ['金钱相关', 'Finance'],
  ['bitcoin', 'Finance'],
  ['blockchain', 'Finance'],
  ['web3', 'Finance'],
  ['经济', 'Finance'],
  ['economics', 'Finance'],
  ['football', 'Sports'],
  ['nba', 'Sports'],
]);

const inferenceRules: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: 'AI', patterns: [/AI|人工智能|生成式|大模型|LLM/i] },
  { tag: 'LLM', patterns: [/LLM|大模型|token|inference|temperature|推理/i] },
  { tag: 'Agent', patterns: [/agent|智能体|Agent Runtime/i] },
  { tag: 'Skill', patterns: [/skill|技能/i] },
  { tag: 'MCP', patterns: [/\bMCP\b/i] },
  { tag: 'RAG', patterns: [/\bRAG\b|检索增强/i] },
  { tag: 'Prompt Engineering', patterns: [/prompt|提示词|Function Calling|工具调用/i] },
  { tag: 'Deep Learning', patterns: [/深度学习|Transformer|Embedding|Softmax|Attention|神经网络|微调|蒸馏|反向传播|梯度/i] },
  { tag: 'Architecture', patterns: [/架构|architecture|设计|方案|系统|重构|模块|抽象/i] },
  { tag: 'Distributed Systems', patterns: [/分布式|RPC|事务|一致性|Seata|RocketMQ|Raft|Consul|ZooKeeper|服务发现/i] },
  { tag: 'Reliability', patterns: [/容灾|降级|高可用|SRE|故障|可用性/i] },
  { tag: 'Database', patterns: [/MySQL|Redis|数据库|索引|事务|缓存|数据迁移/i] },
  { tag: 'Networking', patterns: [/\b(?:TCP|HTTP|DNS|CDN|IP(?:v4|v6)?|VPN|Socket|UDP|SOCKS5)\b|代理|网络|跨域/i] },
  { tag: 'Java', patterns: [/Java|JVM|GC|ClassLoader/i] },
  { tag: 'Go', patterns: [/\bGo\b|Golang/i] },
  { tag: 'Rust', patterns: [/Rust|lifetime|生命周期|ownership|所有权/i] },
  { tag: 'Python', patterns: [/Python|FastAPI/i] },
  { tag: 'Programming Languages', patterns: [/语言|编程语言|lifetime|所有权|动态库|FFI|JNI/i] },
  { tag: 'Reading', patterns: [/读书|摘要|BOOK|书/i] },
  { tag: 'Career', patterns: [/职场|团队|管理|会议|沟通|薪酬|工作/i] },
  { tag: 'Life', patterns: [/生活|认知|成长|学习|哲学/i] },
  { tag: 'Finance', patterns: [/金融|金钱|账户|货币|经济/i] },
  { tag: 'Sports', patterns: [/NBA|足球|梅西|Warriors|Ronaldo|世界杯/i] },
];

const priority = [
  'AI',
  'LLM',
  'Agent',
  'Skill',
  'MCP',
  'RAG',
  'Prompt Engineering',
  'Deep Learning',
  'Architecture',
  'Distributed Systems',
  'Reliability',
  'Security',
  'Testing',
  'Database',
  'Networking',
  'Media',
  'Java',
  'Go',
  'Rust',
  'Python',
  'Programming Languages',
  'Algorithms',
  'Math',
  'Reading',
  'Career',
  'Life',
  'Finance',
  'Sports',
];

const allowedTags = new Set(priority);

export function curateTags({ title, rawTags }: CurateTagsInput): string[] {
  const curated = new Set<string>();

  for (const tag of rawTags) {
    const normalized = normalizeTag(tag);
    if (normalized != null) {
      curated.add(normalized);
    }
  }

  if (curated.size === 0) {
    const haystack = title;
    for (const rule of inferenceRules) {
      if (rule.patterns.some((pattern) => pattern.test(haystack))) {
        curated.add(rule.tag);
      }
    }
  }

  expandRelatedTags(curated);

  return [...curated]
    .sort((a, b) => priorityIndex(a) - priorityIndex(b) || a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .slice(0, maxTagsPerPost);
}

function expandRelatedTags(tags: Set<string>): void {
  if (hasAny(tags, ['LLM', 'Agent', 'Skill', 'MCP', 'RAG', 'Prompt Engineering', 'Deep Learning'])) {
    tags.add('AI');
  }

  if (hasAny(tags, ['Java', 'Go', 'Rust', 'Python'])) {
    tags.add('Programming Languages');
  }
}

function hasAny(tags: Set<string>, candidates: string[]): boolean {
  return candidates.some((tag) => tags.has(tag));
}

function normalizeTag(rawTag: string): string | undefined {
  const trimmed = rawTag.trim();
  if (!trimmed) {
    return undefined;
  }

  const aliased = tagAliases.get(trimmed.toLowerCase());
  if (aliased != null) {
    return aliased;
  }

  const displayTag = normalizeDisplayTag(trimmed);
  return allowedTags.has(displayTag) ? displayTag : undefined;
}

function normalizeDisplayTag(tag: string): string {
  if (/^[a-z][a-z0-9+.#/-]*$/i.test(tag)) {
    return tag
      .split(/[-_ ]+/)
      .map((part) => part.length <= 3 ? part.toUpperCase() : `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}`)
      .join(' ');
  }

  return tag;
}

function priorityIndex(tag: string): number {
  const index = priority.indexOf(tag);
  return index === -1 ? priority.length : index;
}
