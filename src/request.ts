import axios from 'axios';
import { COOKIE as cookie, USER_AGENT, REQ_MIN_INTERVAL } from './config';
import { Observable, Subject, BehaviorSubject, of, defer } from 'rxjs';
import { map, flatMap, take, delay, retryWhen, filter, tap, concatMap, timeout } from 'rxjs/operators';

// 全局 Cookie
let COOKIE: string[] = cookie;
// 请求配置
const REQ_CONFIG = {
  headers: {
    'User-Agent': USER_AGENT,
    'cookie': COOKIE.join(';'),
  }
};

// 频率控制相关的 Subject
const FREQ_REQ_SUBJECT = new Subject<any>();
const FREQ_REP_SUBJECT = new Subject<any>();
// 上一次请求的时间
const LAST_REQ_TIME = new BehaviorSubject<number>(Number.MIN_VALUE);

// 主要用于全局控制请求的频率
FREQ_REQ_SUBJECT.pipe(
  // 保证每两次发射的间隔最小为 REQ_MIN_INTERVAL
  concatMap(e => {
    const interval = Date.now() - LAST_REQ_TIME.getValue();
    if (interval >= REQ_MIN_INTERVAL) {
      // 直接发射
      return of(e).pipe(
        // 记录该次发射的时间
        tap(() => {
          LAST_REQ_TIME.next(Date.now());
        }),
      );
    } else {
      return of(e).pipe(
        // 延迟一定时间再发射
        delay(REQ_MIN_INTERVAL - interval),
        // 记录该次发射的时间
        tap(() => {
          LAST_REQ_TIME.next(Date.now());
        }),
      );
    }
  }),
).subscribe(FREQ_REP_SUBJECT);

// 请求 ID
let REQ_ID = 0;

/* 
 请求某个 URL，返回 Http Body
 */
export function reqGet(url: string): Observable<string> {
  const id = REQ_ID ++;
  // 频率控制的 Observable
  const freqUrlOb = new Observable<string>(subscriber => {
    FREQ_REP_SUBJECT.pipe(
      // 过滤出对应 id 的元素
      filter(e => e.id === id),
      // 只取一个元素就 complete
      take(1),
      // 转换成 url
      map(e => e.url as string),
    ).subscribe(
      url => subscriber.next(url),
      err => subscriber.error(err),
      () => subscriber.complete(),
    );

    // 发射 Url 到频率控制的 Subject
    // 注意，要比 FREQ_REP_SUBJECT 的 subscribe() 慢才行
    FREQ_REQ_SUBJECT.next({
      id, url,
    });
  });

  // 发送请求的 Observable
  const reqOb = defer(async function() {
    console.log('Request: ' + url);

    // 发起请求
    const response = await axios.get(url, REQ_CONFIG);
    // 刷新 Cookie
    COOKIE = response.headers['set-cookie'];
    return response.data;
  }).pipe(
    // 30 秒超时
    timeout(30000),
    // 每次出错等待 3 秒后重试，3 次重试后结束观察
    retryWhen(errors => errors.pipe(
      tap(err => console.log(`请求失败: ${url}`)),
      delay(3000),
      take(3),
    )),
    // 内容不为空才往下发射
    filter(data => data && data.length > 0),
  );

  return freqUrlOb.pipe(
    // 发起请求
    flatMap(() => reqOb),
  );
}
