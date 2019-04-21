// 你在 GitHub 网站的 Cookie
const COOKIE: string[] = [
  '',
];

// 要爬取的目标用户
const TARGET_USERS: string[] = [
  'nekocode',
]

// 请求中附带的 UserAgent
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36';

// 最小请求间隔
const REQ_MIN_INTERVAL = 1000;

export { COOKIE, TARGET_USERS, USER_AGENT, REQ_MIN_INTERVAL };