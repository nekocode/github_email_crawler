这是一个使用 Node.js、RxJS 以及 TypeScript 语言实现的 GitHub 邮箱爬虫，它可以爬取指定用户所有 Follower 的邮箱。它使用了 RxJS 来提高程式的稳定性：

* 使用 Rx 操作符进行容错处理；
* 对全局请求了进行频率控制。

使用方法：更新 [config.ts](src/config.ts) 里的配置，

```
// 你在 GitHub 网站的 Cookie
const COOKIE: string[] = [
  '',
];

// 要爬取 Follower 邮箱的指定用户
const TARGET_USERS: string[] = [
  '',
]
```

然后执行 `yarn start` 即可。
