# Requirements — Milestone v1.1

**Project:** LibreChat Monetization
**Milestone:** v1.1 变现版本
**Date:** 2026-04-10

---

## Active Requirements

### 积分系统 (CREDIT)

- [ ] **CREDIT-01**: 用户余额账户 — 用户有余额字段，记录积分变动
- [ ] **CREDIT-02**: 交易历史 — 记录所有充值、消费、退款记录
- [ ] **CREDIT-03**: API调用扣积分 — 按token用量实时扣减余额
- [ ] **CREDIT-04**: 余额不足拦截 — 余额不足时阻止AI调用

### 支付系统 (PAYMENT)

- [ ] **PAYMENT-01**: Stripe接入 — 微信/支付宝/信用卡付款
- [ ] **PAYMENT-02**: 微信支付直连 — 国内微信支付API
- [ ] **PAYMENT-03**: 支付宝直连 — 国内支付宝API
- [ ] **PAYMENT-04**: 充值套餐 — 固定金额换固定积分
- [ ] **PAYMENT-05**: 支付回调 — 幂等处理防重复充值
- [ ] **PAYMENT-06**: 手动充值 — 管理员后台人工充值

### 广告系统 (ADS)

- [ ] **ADS-01**: 激励视频广告 — 用户观看视频获得积分
- [ ] **ADS-02**: 广告频率限制 — 防止刷广告（每日上限）
- [ ] **ADS-03**: 广告观看验证 — 服务端验证广告完成
- [ ] **ADS-04**: 积分发放 — 广告观看后积分入账

### 会员体系 (MEMBERSHIP)

- [ ] **MEMBERSHIP-01**: 免费用户 — 基础额度，广告可抵扣
- [ ] **MEMBERSHIP-02**: 青铜会员 — 月费，解锁更多额度
- [ ] **MEMBERSHIP-03**: 白银会员 — 月费，优先队列
- [ ] **MEMBERSHIP-04**: 黄金会员 — 月费，API访问权限
- [ ] **MEMBERSHIP-05**: 等级权益控制 — 不同等级不同API额度

---

## Out of Scope

- 退款流程（v2）
- 邀请奖励（v2）
- 积分转账（v2）
- 企业定制（v2+）

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| CREDIT-01 | 1 | — |
| CREDIT-02 | 1 | — |
| CREDIT-03 | 1 | — |
| CREDIT-04 | 1 | — |
| PAYMENT-01 | 2 | — |
| PAYMENT-02 | 2 | — |
| PAYMENT-03 | 2 | — |
| PAYMENT-04 | 2 | — |
| PAYMENT-05 | 2 | — |
| PAYMENT-06 | 1 | — |
| ADS-01 | 3 | — |
| ADS-02 | 3 | — |
| ADS-03 | 3 | — |
| ADS-04 | 3 | — |
| MEMBERSHIP-01 | 1 | — |
| MEMBERSHIP-02 | 4 | — |
| MEMBERSHIP-03 | 4 | — |
| MEMBERSHIP-04 | 4 | — |
| MEMBERSHIP-05 | 1 | — |
