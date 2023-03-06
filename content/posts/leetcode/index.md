---
title: "LeetCode Top100 刷题"
date: 2023-03-06T15:00:47+08:00
tags: ["算法"]
categories: ["算法"]
---

🧠 越来越不好使，刷点算法题提高点智商。   

<!--more-->

### 两数相加

[题目内容](https://leetcode.cn/problems/add-two-numbers/)  

解题思路：递龟。       

```ts
/**
 * Definition for singly-linked list.
 * class ListNode {
 *     val: number
 *     next: ListNode | null
 *     constructor(val?: number, next?: ListNode | null) {
 *         this.val = (val===undefined ? 0 : val)
 *         this.next = (next===undefined ? null : next)
 *     }
 * }
 */

const dfs = (l1: ListNode | null, l2: ListNode | null, carry: number = 0): ListNode => {
    if (!l1 && !l2 && carry === 0) {
        return null;
    }
    const value1 = l1?.val ?? 0;
    const value2 = l2?.val ?? 0;
    const sum = value1 + value2 + carry;
    const node = new ListNode(sum % 10);
    node.next = dfs(l1?.next ?? null, l2?.next ?? null, Math.floor(sum / 10));
    return node;
}
const addTwoNumbers = (l1: ListNode | null, l2: ListNode | null): ListNode | null => {
    return dfs(l1, l2, 0);
};
```


### 两数之和

[题目内容](https://leetcode.cn/problems/two-sum/)

解题思路：哈希表，两数之和变为两数之差。   

```ts
const twoSum = (nums: number[], target: number): number[] => {
    const mapObj: Map<number, number> = new Map();
    for (let i = 0; i < nums.length; i++) {
        if (mapObj.has(target - nums[i])) {
            return [mapObj.get(target - nums[i]), i]
        } else {
            mapObj.set(nums[i], i)
        }
    }
};
```

### 无重复字符的最长子串

[题目内容](https://leetcode.cn/problems/longest-substring-without-repeating-characters/)

解题思路：字符串转换为数组应用累加器求值。       

```ts
const lengthOfLongestSubstring = (s: string): number => {
    let max: number = 0;
    if (s.length <= 1) return s.length;
    s.split('').reduce<string>((acc: string, value: string) => {
        const len = acc.indexOf(value);
        if (len === -1) {
            acc += value;
            max = acc.length > max ? acc.length : max;
            return acc;
        } else {
            acc += value;
            return acc.slice(len + 1);
        }
    }, '')
    return max;
};
```