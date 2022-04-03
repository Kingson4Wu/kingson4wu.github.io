---
title: index_merge导致死锁问题
date: 2022-04-03 13:30:21
tags: [index_merge,dead_lock,MySQL]
---

###  死锁日志
```log
2021-09-02T17:29:31.339235+08:00 10137065 [Note] InnoDB: Transactions deadlock detected, dumping detailed information.
2021-09-02T17:29:31.339268+08:00 10137065 [Note] InnoDB:
*** (1) TRANSACTION:

TRANSACTION 54557980, ACTIVE 0 sec fetching rows
mysql tables in use 3, locked 3
LOCK WAIT 9 lock struct(s), heap size 1136, 4 row lock(s)
MySQL thread id 10137067, OS thread handle 140359751816960, query id 204818581 10.22.45.73 xxx_feed updating
UPDATE `t_user_xxx_2` SET `end` = 1, `updateTime` = now() WHERE `userId`= 186435331 AND `type` = 2 AND `plotId`=1544270738147465267 AND `end` = 0
2021-09-02T17:29:31.339367+08:00 10137065 [Note] InnoDB: *** (1) WAITING FOR THIS LOCK TO BE GRANTED:

RECORD LOCKS space id 329 page no 2076 n bits 112 index PRIMARY of table `d_xxx_feed`.`t_user_xxx_2` trx id 54557980 lock_mode X locks rec but not gap waiting
Record lock, heap no 33 PHYSICAL RECORD: n_fields 24; compact format; info bits 0
0: len 8; hex 956e50cb8d06b6fb; asc nP ;;
1: len 6; hex 000003307520; asc 0u ;;
2: len 7; hex b0000000320110; asc 2 ;;
3: len 8; hex 800000006f1fc602; asc o ;;
4: len 4; hex 80000002; asc ;;
5: len 24; hex e69c89e4b880e8b5b7e8818ae5a4a9e79a84e59097efbc9f; asc ;;
6: len 2; hex 5b5d; asc [];;
7: len 4; hex 80000000; asc ;;
8: len 8; hex 8000000000000000; asc ;;
9: len 8; hex 8000000000000000; asc ;;
10: len 30; hex 7b22706c6f744964223a313534343236303535373335313230323637352c; asc {"plotId":1544260557351202675,; (total 233 bytes);
11: len 12; hex e58f98e68081e4b8bbe4baba; asc ;;
12: len 30; hex 68747470733a2f2f73747564696f696d67627373646c2e636c6f75642e6b; asc https://xxxximgbssdl.cloud.k; (total 75 bytes);
13: len 4; hex 80000002; asc ;;
14: len 8; hex 95551c4bc84d1d5b; asc U K M [;;
15: len 0; hex ; asc ;;
16: len 5; hex 99aa828508; asc ;;
17: len 5; hex 99aa828507; asc ;;
18: len 4; hex 80000000; asc ;;
19: len 8; hex 956e50cb8990af73; asc nP s;;
20: len 1; hex 80; asc ;;
21: len 1; hex 80; asc ;;
22: len 1; hex 81; asc ;;
23: len 1; hex 80; asc ;;

2021-09-02T17:29:31.342776+08:00 10137065 [Note] InnoDB: *** (2) TRANSACTION:

TRANSACTION 54557981, ACTIVE 0 sec fetching rows, thread declared inside InnoDB 5000
mysql tables in use 3, locked 3
11 lock struct(s), heap size 1136, 7 row lock(s)
MySQL thread id 10137065, OS thread handle 140359754024704, query id 204818583 10.31.45.123 xxx_feed updating
UPDATE `t_user_xxxx_2` SET `end` = 1, `updateTime` = now() WHERE `userId`= 186435331 AND `type` = 2 AND `pId`=132434347351202675 AND `end` = 0
2021-09-02T17:29:31.342867+08:00 10137065 [Note] InnoDB: *** (2) HOLDS THE LOCK(S):

RECORD LOCKS space id 329 page no 2076 n bits 112 index PRIMARY of table `d_xxx_feed`.`t_user_xxx_2` trx id 54557981 lock_mode X locks rec but not gap
Record lock, heap no 33 PHYSICAL RECORD: n_fields 24; compact format; info bits 0
0: len 8; hex 956e50cb8d06b6fb; asc nP ;;
1: len 6; hex 000003307520; asc 0u ;;
2: len 7; hex b0000000320110; asc 2 ;;
3: len 8; hex 800000006f1fc602; asc o ;;
4: len 4; hex 80000002; asc ;;
5: len 24; hex e69c89e4b880e8b5b7e8818ae5a4a9e79a84e59097efbc9f; asc ;;
6: len 2; hex 5b5d; asc [];;
7: len 4; hex 80000000; asc ;;
8: len 8; hex 8000000000000000; asc ;;
9: len 8; hex 8000000000000000; asc ;;
10: len 30; hex 7b22706c6f744964223a313534343236303535373335313230323637352c; asc {"plotId":1544260557351202675,; (total 233 bytes);
11: len 12; hex e58f98e68081e4b8bbe4baba; asc ;;
12: len 30; hex 68747470733a2f2f73747564696f696d67627373646c2e636c6f75642e6b; asc https://xxximgbssdl.cloud.k; (total 75 bytes);
13: len 4; hex 80000002; asc ;;
14: len 8; hex 95551c4bc84d1d5b; asc U K M [;;
15: len 0; hex ; asc ;;
16: len 5; hex 99aa828508; asc ;;
17: len 5; hex 99aa828507; asc ;;
18: len 4; hex 80000000; asc ;;
19: len 8; hex 956e50cb8990af73; asc nP s;;
20: len 1; hex 80; asc ;;
21: len 1; hex 80; asc ;;
22: len 1; hex 81; asc ;;
23: len 1; hex 80; asc ;;

2021-09-02T17:29:31.345307+08:00 10137065 [Note] InnoDB: *** (2) WAITING FOR THIS LOCK TO BE GRANTED:

RECORD LOCKS space id 329 page no 574 n bits 680 index idx_userId_type of table `d_xxx_feed`.`t_user_xxx_2` trx id 54557981 lock_mode X locks rec but not gap waiting
Record lock, heap no 567 PHYSICAL RECORD: n_fields 3; compact format; info bits 0
0: len 8; hex 800000006f1fc602; asc o ;;
1: len 4; hex 80000002; asc ;;
2: len 8; hex 956e50cb8d06b6fb; asc nP ;;

2021-09-02T17:29:31.345666+08:00 10137065 [Note] InnoDB: *** WE ROLL BACK TRANSACTION (1)

```

### 表结构
```SQL
CREATE TABLE `t_user_xxx_2` (
`id` bigint(20) NOT NULL COMMENT 'xxId',
`userId` bigint(20) DEFAULT '0' COMMENT '发布人userId',
`type` int(11) DEFAULT '0' COMMENT 'xxx',
`content` varchar(4000) DEFAULT '' COMMENT '文字',
`images` varchar(4000) DEFAULT '' COMMENT '图片',
`deleted` int(11) NOT NULL DEFAULT '1' COMMENT '动态状态,0：新增，1：删除',
`commentCnt` bigint(20) DEFAULT '0' COMMENT '评论数',
`likeCnt` bigint(20) DEFAULT '0' COMMENT '点赞数',
`contentExt` varchar(4000) DEFAULT '' COMMENT '内容扩展',
`nickname` varchar(255) DEFAULT '' COMMENT '昵称',
`userLogo` varchar(255) DEFAULT '' COMMENT '头像',
`userType` int(11) DEFAULT '0' COMMENT 'xxx',
`rId` bigint(20) DEFAULT '0' COMMENT 'xxxid',
`remark` varchar(255) DEFAULT '' COMMENT '备注',
`createTime` datetime DEFAULT NULL COMMENT '创建时间',
`updateTime` datetime DEFAULT NULL COMMENT '更新时间',
`roomId` int(11) NOT NULL DEFAULT '0' COMMENT '房间id',
`pId` bigint(20) NOT NULL DEFAULT '0' COMMENT 'xxid',
`end` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否结束',
`hideType` tinyint(4) NOT NULL DEFAULT '0' COMMENT '隐藏类型：xxx',
`status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '审核状态：0审核中，1审核通过，2审核不通过',
`contentStatus` tinyint(4) NOT NULL DEFAULT '0' COMMENT '0不违规，1违规',
PRIMARY KEY (`id`),
KEY `idx_userId_type` (`userId`,`type`) USING BTREE,
KEY `idx_createTime` (`createTime`) USING BTREE,
KEY `idx_type` (`type`) USING BTREE,
KEY `idx_user_rId` (`userId`,`rId`) USING BTREE,
KEY `idx_pId` (`pId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='以动态发布者userId模10分表'
```

### 四种类型的行锁
+ 记录锁，间隙锁，Next-key 锁和插入意向锁。这四种锁对应的死锁日志各不相同，如下：
	- 记录锁（LOCK_REC_NOT_GAP）: `lock_mode X locks rec but not gap`
	- 间隙锁（LOCK_GAP）: `lock_mode X locks gap before rec`
	- Next-key 锁（LOCK_ORNIDARY）: `lock_mode X`
	- 插入意向锁（LOCK_INSERT_INTENTION）: `lock_mode X locks gap before rec insert intention`

### 分析
+ 语句的type是index_merge，Extra的信息是Using intersect(idx_user_type,idx_pId)，执行计划走了index_merge优化，单个语句通过两个索引(idx_userId_type,idx_pId)来提取记录集合并取交集获得最终结果集。

### 解决方式
1. 关闭：index_merge_intersection=off （解决思路：直接关闭MySQL的优化）
2. 删掉多余的索引idx_pId（解决思路：建立合理的索引）--- 此案例中，根据业务实际情况，使用该方案解决
3. 先查，再使用主键或唯一索引来更新（解决思路：缩小索引范围） （推荐）
4. 强制走idx_userId_type 索引
5. 添加userId + type + pId的组合索引，这样就可以避免掉index merge

### Reference
+ [MySQL update use index merge(Using intersect) increase chances for deadlock]
(https://developer.aliyun.com/article/8963)
+ <https://dev.mysql.com/doc/refman/8.0/en/index-merge-optimization.html#index-merge-intersection>
