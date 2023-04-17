---
title: "🔥 LeetCode HOT 100"
date: 2023-04-17T11:40:47+08:00
weight: 2
tags: ["算法"]
categories: ["算法"]
---

脑子越来越不好使，刷点算法题提高点智商。       

<!--more-->    

## Medium

### 全排列

[题目内容](https://leetcode.cn/problems/permutations/)

#### 解题思路

回溯 + 剪枝。

* 每一位都有3种选择：1、2、3。   
* 每一次都做选择，展开出一棵空间树。    
* 利用 hashMap，记录选过的数，下次遇到相同的数，跳过。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/leetcode/img_04.png" alt="" width="600" />   

#### 代码实现

```ts
const permute = (nums: number[]): number[][] => {
  const res: number[][] = [];
  const used: Record<string, boolean> = {};
  const dfs = (path: number[]) => {
    if (path.length === nums.length) {
      res.push(path.slice());
      return;
    }
    for (const num of nums) {
      if (used[String(num)]) continue;
      path.push(num);
      used[String(num)] = true;
      dfs(path);
      path.pop();
      used[String(num)] = false;
    }
  }
  dfs([]);
  return res;
};
```

### 组合总和

[题目内容](https://leetcode.cn/problems/combination-sum/)

#### 解题思路

回溯 + 剪枝。    

* 剪枝：sum > target 结束当前递龟；sum === target 路径加入解集；限制下次递龟的起点避免重复组合。   
* ×：当前组合和之前生成的组合重复了。
* △：当前求和 > target，不能选下去了，返回。
* ○：求和正好 == target，加入解集，并返回。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/leetcode/img_03.png" alt="" width="600" />   

#### 代码实现

```ts
const combinationSum = (candidates: number[], target: number): number[][] => {
  const res: number[][] = [];
  const backTrace = (start: number, temp: number[], sum: number): void => {
    if (sum > target) return;
    if (sum === target) res.push([...temp]);
    for (let i = start; i < candidates.length; i++) {
      temp.push(candidates[i]); // 选这个数
      backTrace(i, temp, sum + candidates[i])
      temp.pop(); // 撤销选择，继续尝试选同层右边的数
    }
  }
  backTrace(0, [], 0);
  return res;
};
```

### 在排序数组中查找元素的第一个和最后一个位置

[题目内容](https://leetcode.cn/problems/find-first-and-last-position-of-element-in-sorted-array/)    

#### 解题思路

题目要求时间复杂度为 O(log n)，二分法。    
 
* 二分查找中，寻找 leftIndex 即为在数组中寻找第一个大于等于 target 的下标，寻找 rightIndex 即为在数组中寻找第一个大于 target 的下标，然后将下标减一。   
* binarySearch(nums, target, lower) 表示在 nums 数组中二分查找 target 的位置，如果 lower 为 true，则查找第一个大于等于 target 的下标，否则查找第一个大于 target 的下标。    
* target 可能不存在数组中，需要重新校验获得的两个下标 leftIndex 和 rightIndex，不符合则返回 [-1, -1];    

#### 代码实现

```ts
const searchRange = (nums: number[], target: number): number[] => {
  const binarySearch = (nums: number[], target: number, lower: boolean): number => {
    let left: number = 0, right: number = nums.length - 1, ans: number = nums.length;
    while (left <= right) {
      const mid: number = left + ((right - left) >> 1);
      if (nums[mid] > target || (lower && nums[mid] >= target)) {
        right = mid - 1;
        ans = mid;
      } else {
        left = mid + 1;
      }
    }
    return ans;
  }
  let ans = [-1, -1];
  const leftIndex = binarySearch(nums, target, true);
  const rightIndex = binarySearch(nums, target, false) - 1;
  if(leftIndex <= rightIndex && rightIndex < nums.length && nums[leftIndex] === target && nums[rightIndex] === target) {
    ans = [leftIndex, rightIndex];
  }
  return ans;
};
```

### 搜索旋转排序数组

[题目内容](https://leetcode.cn/problems/search-in-rotated-sorted-array/)   

#### 解题思路

题目要求时间复杂度为 O(log n)，二分法。    

随便选择一个点，将数组一分为二，其中一部分一定是有序的。    

* 先找出 mid，根据 mid 来判断，mid 是在有序部分还是无序部分。   
* 如果 mid 小于 start，则 mid 一定在右边有序部分。    
* 如果 mid 大于等于 start， 则 mid 一定在左边有序部分。   
* 继续判断 target 在哪一部分。    

#### 代码实现

```ts
const search = (nums: number[], target: number): number => {
  let start: number = 0;
  let end: number = nums.length - 1;
  while(start <= end) {
    const mid: number = start + ((end - start) >> 1);
    if (nums[mid] === target) return mid;
    if (nums[mid] >= nums[start]) {
      if (target >= nums[start] && target <= nums[mid]) {
        end = mid - 1;
      } else {
        start = mid + 1;
      }
    } else {
      if (target >= nums[mid] && target <= nums[end]) {
        start = mid + 1;
      } else {
        end = mid - 1;
      }
    }
  }
  return -1;
};
```

### 下一个排列   

[题目内容](https://leetcode.cn/problems/next-permutation/)

#### 解题思路

从低位挑一个大一点的数，交换前面一个小一点的数，变大的幅度要尽量小。    

* [3, 2, 1]，没有下一个排列，已经稳定了，没法变大了。    
* [1, 5, 2, 4, 3, 2]，从右往左，寻找第一个比右邻居小的数，把它换到后面去。     
* 1 5 (2) 4 3 2，找到中间这个 (2)，接着还是从右往左找，找第一个比 2 大的数和它交换，交换后：1 5 (3) 4 (2) 2。     
* 此时还没结束，变大的幅度还可以再小一点，千位变大了，后三位可以继续再小一点。    
* 后三位肯定是递减的，翻转，变为 [1, 5, 3, 2, 2, 4]，即为所求。   

#### 代码实现

```ts
/**
 Do not return anything, modify nums in-place instead.
 */
const nextPermutation = (nums: number[]): void => {
  let i: number = nums.length - 2;
  while(i >= 0 && nums[i] >= nums[i + 1]) {
    i--;
  }
  if (i >= 0) {
    let j: number = nums.length - 1;
    while(j >= 0 && nums[j] <= nums[i]) {
      j--
    };
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  let l: number = i + 1;
  let r: number = nums.length - 1;
  while(l < r) {
    [nums[l], nums[r]] = [nums[r], nums[l]];
    l++;
    r--;
  }
};
```

### 括号生成

[题目内容](https://leetcode.cn/problems/generate-parentheses/)

#### 解题思路

BFS + 去重。    

从 n - 1 推导 n 的组合情况，只需要遍历 n - 1 的所有组合，并在所有组合的每个位置填入一对括号 () 并去重即可。     

#### 代码实现

```ts
const generateParenthesis = (n: number): string[] => {
  let set: Set<string> = new Set(['()']);
  for (let i = 2; i <= n; i++) {
    let nextSet: Set<string> = new Set();
    for (const s of set) {
      for (let j = 0; j < s.length; j++) {
        nextSet.add(`${s.slice(0, j)}()${s.slice(j)}`);
      }
    }
    set = nextSet;
  }
  return [...set];
};
```

### 删除链表的倒数第 N 个结点

[题目内容](https://leetcode.cn/problems/remove-nth-node-from-end-of-list/)

#### 解题思路

快慢指针 + 虚拟头结点。   

* 初始化快慢指针 slow、fast 指向虚拟头结点。   
* fast 向后移动 n 个位置，此时 fast 和 slow 之间相隔的元素个数为 n。   
* 同时向后移动 fast 和 slow，当 fast 移动到最后时，slow 的下一个结点就是要删除的倒数第 n 个结点。   
* 将 slow 的下一个结点指向下下个结点，则删除倒数第 n 个结点。    

#### 代码实现

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

const removeNthFromEnd = (head: ListNode | null, n: number): ListNode | null => {
  let dmy: ListNode | null = new ListNode(0, head);
  let slow: ListNode | null = dmy;
  let fast: ListNode | null = dmy;
  while (n--) fast = fast.next;
  while (fast && fast.next) {
    fast = fast.next;
    slow = slow.next;
  }
  slow.next = slow.next.next;
  return dmy.next;
};
```

### 电话号码的字母组合

[题目内容](https://leetcode.cn/problems/letter-combinations-of-a-phone-number)

#### 解题思路

回溯。    

#### 代码实现

```ts
const letterCombinations = (digits: string): string[] => {
  const map = [
    '',
    '',
    'abc',
    'def',
    'ghi',
    'jkl',
    'mno',
    'pqrs',
    'tuv',
    'wxyz',
  ]
  const ans: string[] = []
  const length = digits.length;
  if (!length) return ans;
  const backTrack = (digitsIndex: number, s: string) => {
    if (digitsIndex === length) {
      return ans.push(s);
    }
    for (let i = 0; i < map[digits[digitsIndex]].length; i++) {
      backTrack(digitsIndex + 1, s + map[digits[digitsIndex]][i]);
    }
  }
  backTrack(0, '');
  return ans;
};
```

### 三数之和

[题目内容](https://leetcode.cn/problems/3sum)

#### 解题思路

双指针。

先将数组 nums 由小到大排序。    

如果数组长度小于 3，则直接返回空数组。    

固定 3 个指针中最左侧的指针 i，双指针 left、right 分设在数组索引 i + 1 和数组尾端，交替向中间移动，记录每个固定指针 i 的所有满足 nums[i] + nums[right] + nums[left] = 0 的 i、left、right 组合：    

* 当 num[i] > 0 时直接跳出，因为 nums[i] + nums[right] + nums[left] > 0，即 3 个数字都大于 0。    
* 当 i > 0 且 nums[i] === nums[i - 1] 时跳过此时的元素 nums[i]，因为已经将 nums[i - 1] 的所有组合加入到结果中。   
* left、right 分设在数组索引两端，当 left < right 时，循环计算 nums[i] + nums[right] + nums[left]。    
* 如果三者和 > 0，right--。      
* 如果三者和 < 0，left++。    
* 如果三者和 === 0，记录组合到 result， right--、left++、并跳过所有重复的 nums[right]、nums[left]。    

#### 代码实现

```ts
const threeSum = (nums: number[]): number[][] => {
  nums.sort((a, b) => a - b);
  let result: number[][] = [];
  if (nums.length < 3) return result;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] > 0) return result;
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    let left: number = i + 1;
    let right: number = nums.length - 1;
    while (right > left) {
      if (nums[i] + nums[right] + nums[left] > 0) {
        right--;
      } else if (nums[i] + nums[right] + nums[left] < 0) {
        left++
      } else {
        result.push([nums[i], nums[left], nums[right]]);
        while(right > left && nums[left] === nums[left + 1]) left++;
        while(right > left && nums[right] === nums[right - 1]) right--;
        left++;
        right--;
      }
    }
  }
  return result;
};
```

### 盛最多水的容器

[题目内容](https://leetcode.cn/problems/container-with-most-water/)

#### 解题思路

双指针。    

不断计算面积，更新最大面积。    

#### 代码实现

```ts
const maxArea = (arr: number[]): number => {
    let max: number = 0;
    for (let i = 0, j = arr.length - 1; i < j;) {
      const minHeight: number = arr[i] < arr[j] ? arr[i++] : arr[j--];
      const area: number = (j - i + 1) * minHeight;
      max = Math.max(max, area);
    }
    return max;
};
```

### 最长回文子串

[题目内容](https://leetcode.cn/problems/longest-palindromic-substring/)

#### 解题思路

贪心 + 双指针。    

中心扩展，遍历数组，找到连续一样的子字符串，然后逐渐向两侧扩展，直到越界或两侧不一致。     

#### 代码实现

```ts
const longestPalindrome = (s: string): string => {
  let max: number = 0; // 当前最大回文串的长度
  let start: number = -1; // 当前最大回文串的起始索引
  for(let i = 0; i < s.length; i++) {
    let now: number = 1; // 当前回文串的长度
    let l: number = i - 1; // 左侧开始遍历的指针
    while (s[i] === s[i + 1]) { // 向后找，如果后面字符与当前字符都一样，则长度 + 1
      now++;
      i++
    }
    let r: number = i + 1; // 右侧开始遍历的指针
    while(s[l] && s[r] && s[l] === s[r]) {  // 从连续字符两端开始逐渐向两侧扩展，直到遇到越界或者两者不一致
      now += 2;
      l--;
      r++;
    }
    if (now > max) { // 更新当前最大回文串的起始索引和长度
      max = now;
      start = l + 1;
    }
  }
  return s?.slice(start, start + max); // 通过长度和起始索引，获得需要的字符串
};
```

### 无重复字符的最长子串

[题目内容](https://leetcode.cn/problems/longest-substring-without-repeating-characters/)

#### 解题思路

字符串转换为数组应用累加器求值。

#### 代码实现

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

### 两数相加

[题目内容](https://leetcode.cn/problems/add-two-numbers/)

#### 解题思路

递 🐢。

#### 代码实现

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

## Easy 

### 合并二叉树   

[题目内容](https://leetcode.cn/problems/merge-two-binary-trees/)

#### 解题思路

递 🐢。     

同步遍历两棵树上的节点，直接在 t1 上修改。    

* t1 为 null、t2 不为 null，t1 换成 t2。        
* t2 为 null、t1 不为 null，t1 仍为 t1。     
* t1 和 t2 都为 null，t1 仍为 t1。    
* t1、t2 都存在，将 t2 的值加到 t1 上。     
* 子树合并使用递龟。     

#### 代码实现

```ts
/**
 * Definition for a binary tree node.
 * class TreeNode {
 *     val: number
 *     left: TreeNode | null
 *     right: TreeNode | null
 *     constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {
 *         this.val = (val===undefined ? 0 : val)
 *         this.left = (left===undefined ? null : left)
 *         this.right = (right===undefined ? null : right)
 *     }
 * }
 */

const mergeTrees = (root1: TreeNode | null, root2: TreeNode | null): TreeNode | null => {
  if (root1 === null && root2) {
    return root2;
  }
  if (root1 && root2 === null || root1 === null && root2 === null) {
    return root1;
  }
  root1.val += root2.val;
  root1.left = mergeTrees(root1.left, root2.left);
  root1.right = mergeTrees(root1.right, root2.right);
  return root1;
};
```

### 二叉树的直径

[题目内容](https://leetcode.cn/problems/diameter-of-binary-tree/)

#### 解题思路

递 🐢。  

#### 代码实现

```ts
/**
 * Definition for a binary tree node.
 * class TreeNode {
 *     val: number
 *     left: TreeNode | null
 *     right: TreeNode | null
 *     constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {
 *         this.val = (val===undefined ? 0 : val)
 *         this.left = (left===undefined ? null : left)
 *         this.right = (right===undefined ? null : right)
 *     }
 * }
 */

const diameterOfBinaryTree = (root: TreeNode | null): number => {
  let ans: number = 0;
  const depth = (rootNode: TreeNode | null): number => {
    if (!rootNode) return 0;
    const L: number = depth(rootNode.left);
    const R: number = depth(rootNode.right);
    ans = Math.max(ans, L + R + 1); // 将每个节点最大直径(左子树深度 + 右子树深度)与当前最大值比较并取大者
    return Math.max(L, R); // 返回节点深度
  }
  depth(root);
  return ans;
};
```

### 汉明距离

[题目内容](https://leetcode.cn/problems/hamming-distance/)

#### 解题思路

异或位运算 + Brian Kernighan 算法。    

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/leetcode/img.png" alt="" width="600" />  
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/leetcode/img_02.png" alt="" width="600" />

#### 代码实现

```ts
const hammingDistance = (x: number, y: number): number => {
  let s: number = x ^ y;
  const countOneNums = (n: number): number => {
    let count: number = 0;
    while(n) {
      n &= n - 1;
      ++count;
    }
    return count;
  }
  return countOneNums(s);
};
```

### 找到所有数组中消失的数字

[题目内容](https://leetcode.cn/problems/find-all-numbers-disappeared-in-an-array/)

#### 解题思路

哈希的数组替代法。    

nums 数组中一定存在重复的数字，nums 中的数字一定属于 [1, n]。

在第一个 for 循环中更改了 nums 的部分值，对于 nums[i] 的值改变次数是由出现了多少次 i + 1 值。数 i 若存在则下标是 i - 1 这个位置的数一定大于 n，被改变了。    

[4, 3, 2, 7, 8, 2, 3, 1] 在第一个 for 循环结束后是 [12, 19, 18, 15, 8, 2, 11, 9] n = 8。    

nums[1] = 3 被改变了 2 次得到 19 即出现了两次2，nums[2] = 2 被改变了 2 次变成了 18 即出现了两次 3。   

#### 代码实现

```ts
const findDisappearedNumbers = (nums: number[]): number[] => {
  const n: number = nums.length;
  for (const num of nums) {
    const x: number = (num - 1) % n;
    nums[x] += n;
  }
  const ret: number[] = [];
  for (const [i, num] of nums.entries()) {
    if (num <= n) {
      // 下标是 i，题目中要求的值为 i + 1
      ret.push(i + 1);
    }
  }
  return ret;
};
```

### 比特位计数

[题目内容](https://leetcode.cn/problems/counting-bits/)

#### 解题思路

Brian Kernighan 算法。    

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/leetcode/img_02.png" alt="" width="600" />  

#### 代码实现

```ts
const countBits = (n: number): number[] => {
    const result: number[] = new Array(n + 1).fill(0);
    const countOneNums = (n: number): number => {
        let count: number = 0;
        while(n) {
            n &= n - 1;
            ++count;
        }
        return count;
    }
    for (let i = 0; i <= n; i++) {
        result[i] = countOneNums(i);
    }
    return result;
};
```

### 移动零

[题目内容](https://leetcode.cn/problems/move-zeroes/)

#### 解题思路

双指针 + 遍历。   

参考快速排序的思想，确定一个待分割的元素做中间节点 x，然后把所有小于等于 x 的元素放到 x 的左边，大于 x 的元素放到它的右边。    

* 初始化两个指针 i 和 j，j 指针用于找中间点 0，i 指针用于找中间点右侧的非 0 元素。    
* 如果两个指针指向元素均不为 0，整体向右移动一位。   
* 如果 j 指针找到了中间点 0，i 没有找到中间点右侧的非 0 元素，则继续下一轮循环。    
* 如果 j 指针找到了中间点 0，i 指针也找到了中间点右侧的非 0 元素，则通过一个临时变量来交换两个元素的值。   

#### 代码实现

```ts
/**
 Do not return anything, modify nums in-place instead.
 */
const moveZeroes = (nums: number[]): number[] => {
    let j: number = 0;
    for (let i = 0; i < nums.length; i++) {
      switch(true) {
        case nums[i] !== 0 && nums[j]!== 0:
          j++;
          break;
        case nums[j] === 0 && nums[i] === 0:
          continue;
          break;
        case nums[j] === 0 && nums[i] !== 0:
          const tmp: number = nums[i];
          nums[i] = nums[j];
          nums[j++] = tmp;
          break;
        default:
          break;  
      }
    }
    return nums;
};
```

### 回文链表

[题目内容](https://leetcode.cn/problems/palindrome-linked-list/)

#### 解题思路

快慢指针 + 反转链表。   

* 初始化快慢指针 slow、fast 指向 head，fast 每次走两步，slow 每次走一步，当 fast 走到最后，slow 位于中间位置，slow 在移动期间不断反转前半部分链表，反转后为 prev。
* 判断链表长度的奇偶性，如果是奇数 (即此时 fast 不为 null)，slow 再向后移动一步，过滤掉中间的公共节点。
* prev 和 slow 此时分别为原链表的前半部分（反转后）和后半部分的头节点，循环判断 prev 和 slow 的值，都相同则返回 true，否则结束循环返回 false。    

#### 代码实现

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

const isPalindrome = (head: ListNode | null): boolean => {
    let fast: ListNode | null = head;
    let slow: ListNode | null = head;
    let prev: ListNode | null = null;
    while(fast !== null && fast?.next !== null) {
      fast = fast?.next?.next;
      const next: ListNode | null = slow?.next;
      slow.next = prev;
      prev = slow;
      slow = next;
    }
    if (fast !== null) slow = slow?.next;

    while(slow !== null && prev !== null) {
      if (slow?.val !== prev?.val) return false;
      prev = prev?.next;
      slow = slow?.next;
    }
    return true;
};
```

### 翻转二叉树

[题目内容](https://leetcode.cn/problems/invert-binary-tree/)

#### 解题思路

递 🐢。    

#### 代码实现

```ts
/**
 * Definition for a binary tree node.
 * class TreeNode {
 *     val: number
 *     left: TreeNode | null
 *     right: TreeNode | null
 *     constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {
 *         this.val = (val===undefined ? 0 : val)
 *         this.left = (left===undefined ? null : left)
 *         this.right = (right===undefined ? null : right)
 *     }
 * }
 */

const invertTree = (root: TreeNode | null): TreeNode | null => {
  if (root) {
    [root.left, root.right] = [invertTree(root.right), invertTree(root.left)];
  }
  return root;
};
```

### 反转链表

[题目内容](https://leetcode.cn/problems/reverse-linked-list/)

#### 解题思路

迭代。    

#### 代码实现

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

const reverseList = (head: ListNode | null): ListNode | null => {
  let prev: ListNode | null = null;
  let curr: ListNode | null = head;
  while(curr) {
    const next: ListNode | null = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
};
```

### 多数元素

[题目内容](https://leetcode.cn/problems/majority-element/)      

#### 解题思路   

摩尔投票法: 两两对抗，票数抵消。         

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/leetcode/img_01.png" alt="" width="600" />     

#### 代码实现

```ts
const majorityElement = (nums: number[]): number => {
  let count: number = 1;
  let major: number = nums[0];
  for (let i = 1; i < nums.length; i++) {
    if (count === 0) {
      major = nums[i];
      count = 1
    } else if (major === nums[i]) {
      count += 1;
    } else {
      count -= 1;
    }
  }
  return major;
};
```

### 相交链表

[题目内容](https://leetcode.cn/problems/intersection-of-two-linked-lists/)

#### 解题思路

哈希。

#### 代码实现

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

const getIntersectionNode = (headA: ListNode | null, headB: ListNode | null): ListNode | null => {
    let setA = new Set<ListNode>();
    let curr = headA;
    while(curr !== null) {
        setA.add(curr);
        curr = curr.next;
    }
    curr = headB;
    while(curr !== null) {
        if (setA.has(curr)) return curr;
        curr = curr.next;
    }
    return null;
};
```

### 环形链表

[题目内容](https://leetcode.cn/problems/linked-list-cycle/)

#### 解题思路

快慢指针。       

#### 代码实现

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

const hasCycle = (head: ListNode | null): boolean => {
  let slow: ListNode | null = head;
  let fast: ListNode | null = head;
  while(fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) {
      return true;
    }
  }
  return false;
};
```

### 只出现一次的数字

[题目内容](https://leetcode.cn/problems/single-number/)

#### 解题思路

异或位运算。    

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/leetcode/img.png" alt="" width="600" />  

#### 代码实现

```ts
const singleNumber = (nums: number[]): number => {
    let num: number = nums[0];
    if (nums.length > 1) {
        for (let i = 1; i < nums.length; i++) {
            num ^= nums[i];
        }
    }
    return num;
};
```

### 买卖股票的最佳时机 

[题目内容](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock/)

#### 解题思路

贪心，取最左最小值，取最右最大值，得到的差值就是最大利润。      

#### 代码实现

```ts
const maxProfit = (prices: number[]): number => {
    if (prices.length === 0) return 0;
    let min: number = prices[0];
    let max: number = 0;
    for (let item of prices) {
        min = Math.min(min, item);
        max = Math.max(max, item - min);
    }
    return max;
};
```

### 二叉树的最大深度

[题目内容](https://leetcode.cn/problems/maximum-depth-of-binary-tree/)

#### 解题思路

dfs + 递 🐢。    

#### 代码实现

```ts
/**
 * Definition for a binary tree node.
 * class TreeNode {
 *     val: number
 *     left: TreeNode | null
 *     right: TreeNode | null
 *     constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {
 *         this.val = (val===undefined ? 0 : val)
 *         this.left = (left===undefined ? null : left)
 *         this.right = (right===undefined ? null : right)
 *     }
 * }
 */

const maxDepth = (root: TreeNode | null): number => {
    if (root === null) return 0;
    let leftDepth = maxDepth(root?.left);
    let rightDepth = maxDepth(root?.right);
    return Math.max(leftDepth, rightDepth) + 1;
};
```

### 对称二叉树

[题目内容](https://leetcode.cn/problems/symmetric-tree/)

#### 解题思路

递 🐢。    

#### 代码实现

```ts
/**
 * Definition for a binary tree node.
 * class TreeNode {
 *     val: number
 *     left: TreeNode | null
 *     right: TreeNode | null
 *     constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {
 *         this.val = (val===undefined ? 0 : val)
 *         this.left = (left===undefined ? null : left)
 *         this.right = (right===undefined ? null : right)
 *     }
 * }
 */

const isSymmetric = (root: TreeNode | null): boolean => {
    const check = (p: TreeNode | null, q: TreeNode | null): boolean => {
        if (!p && !q) return true;
        if (!p || !q) return false;
        return p.val === q.val && check(p.left, q.right) && check(p.right, q.left);
    }
    return check(root, root);
};
```

### 二叉树的中序遍历

[题目内容](https://leetcode.cn/problems/binary-tree-inorder-traversal/)

#### 解题思路   

递 🐢。   

#### 代码实现

```ts
/**
 * Definition for a binary tree node.
 * class TreeNode {
 *     val: number
 *     left: TreeNode | null
 *     right: TreeNode | null
 *     constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {
 *         this.val = (val===undefined ? 0 : val)
 *         this.left = (left===undefined ? null : left)
 *         this.right = (right===undefined ? null : right)
 *     }
 * }
 */

const inorderTraversal = (root: TreeNode | null): number[] => {
    let res: number[] = [];
    const preOrder = (root: TreeNode | null): void => {
        if (!root) return;
        preOrder(root?.left);
        res.push(root?.val);
        preOrder(root?.right);
    } 
    preOrder(root);
    return res;
};
```

### 合并两个有序链表

[题目内容](https://leetcode.cn/problems/merge-two-sorted-lists/)

#### 解题思路

创建新节点。     

#### 代码实现

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

const mergeTwoLists = (list1: ListNode | null, list2: ListNode | null): ListNode | null => {
    const head: ListNode = new ListNode(-1);
    let current: ListNode = head;
    while(list1 !== null && list2 !== null) {
        if (list1.val < list2.val) {
            current.next = list1;
            list1 = list1.next;
        } else {
            current.next = list2;
            list2 = list2.next
        }
        current = current.next
    }
    if (list1 === null) current.next = list2;
    if (list2 === null) current.next = list1;
    return head.next;
};
```

### 有效的括号

[题目内容](https://leetcode.cn/problems/valid-parentheses/)

#### 解题思路   

栈。    

#### 代码实现

```ts
const isValid = (s: string): boolean => {
    type KeyType = ')' | '}' | ']';
    type ValueType = '(' | '{' | '[';
    const n: number = s.length;
    if (n % 2 === 1) return false;
    const mapObj: Record<KeyType, ValueType> = {
        ')': '(',
        '}': '{',
        ']': '['
    }
    const stk: ValueType[] = [];
    for (let item of s) {
        if (item in mapObj) {
           let top = stk.pop();
           if (mapObj[item] !== top) {
               return false;
           } 
        } else {
            stk.push(item as ValueType);
        }
    }
    return !stk.length;
};
```

### 两数之和

[题目内容](https://leetcode.cn/problems/two-sum/)

#### 解题思路  

哈希表，两数之和变为两数之差。     

#### 代码实现

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
