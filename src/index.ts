import * as cheerio from 'cheerio'
import * as fs from 'fs';
import { Observable, Subject, from, of } from 'rxjs';
import { map, flatMap, filter, tap, toArray } from 'rxjs/operators';
import { reqGet } from './request';
import { TARGET_USERS } from './config';

/* 
 获取指定用户的邮箱
 */
function getUserEmail(userName: string): Observable<string> {
  return reqGet(`https://github.com/${userName}`).pipe(
    // 抓取 Email
    map(html => {
      const $ = cheerio.load(html);
      const email = $('.u-email').text();
      return email;
    }),
    // 内容不为空才往下发射
    filter(email => email && email.length > 0),
  );
}

/* 
 获取指定用户所有 Follower 的 ID
 */
function getFollowers(userName: string): Observable<string> {
  const subject = new Subject<string>();
  const subjectOb = new Observable<string>(subscriber => {
    subject.subscribe(
      url => subscriber.next(url),
      err => subscriber.error(err),
      () => {
        subscriber.complete();
      }
    );

    // 注意，要比 subject 的 subscribe() 慢才行
    subject.next(`https://github.com/${userName}?tab=followers`);
  });

  return subjectOb.pipe(
    // 请求 Follower 页面
    flatMap(url => reqGet(url)),
    // 抓取该页所有 Follower 的 ID
    map(html => {
      const $ = cheerio.load(html);
      const followers: string[] = $('.d-table-cell span.link-gray')
        .map((_, el) => {
          return $(el).text();
        })
        .get();

      const next: CheerioElement = $('.paginate-container *:nth-child(2)').get(0);
      if (next && 'a' === next.tagName) {
        // 发射新的 URL
        subject.next(next.attribs['href']);
      } else {
        subject.complete();
      }

      return followers;
    }),
    // 单独发射元素
    flatMap(followers => from(followers)),
  );
}

/* 
 添加行到文件
 */
function appendLine(file: string, line: string): Observable<string> {
  return new Observable(subscriber => {
    fs.appendFile(file, line + '\n', err => {
      if (err) {
        subscriber.error(err);
      } else {
        subscriber.next(line);
        subscriber.complete();
      }
    });
  });
}

function main() {
  from(TARGET_USERS).pipe(
    flatMap(user => {
      // 抓取所有 Follower
      return getFollowers(user).pipe(
        // 输出 Log
        tap(follower => console.log('成功抓取 Follower: ' + follower)),
        // 转换成集合，保证抓完所有 Follower 再继续抓邮箱
        toArray(),
        // 扁平化
        flatMap(followers => from(followers)),
        // 抓取用户 Email
        flatMap(follower => getUserEmail(follower)),
        // 保存用户邮箱到文件中
        flatMap(email => appendLine(__dirname + '/emails.txt', email)),
        // 输出 Log
        tap(email => console.log('成功抓取 Email: ' + email)),
      );
    }),
  ).subscribe(
    () => {},
    err => console.log('发生错误: ' + err),
    () => console.log('所有操作已完成！')
  );
}

main();
