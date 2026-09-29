import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from '../i18n/locales.ts';
/**
 * 账号行（客户线，2026-09-29）——侧栏/抽屉底部的「圆形头像 + 账号名」，点击
 * 弹出「修改密码 / 退出登录」两项（不显示会话有效期：2026-09-29 用户口径，
 * 能退出就行）。
 *
 * 修改密码（2026-09-29 晚，店主口径）：菜单项 `account-password` → 居中弹窗
 * （`account-password-overlay` 遮罩 + `account-password-dialog` 卡片），三格
 * 输入（当前密码 / 新密码 ≥8 位 / 确认新密码），提交走同源
 * `POST /__portal/api/password`。门户在改密成功后**原地轮换会话**
 * （响应 Set-Cookie 换新的 dsh_portal 会话与实例凭据）——用户完全不中断、
 * 不需要重新登录；门户降级未轮换时旧会话也照旧有效。校验与门户同口径
 * （非空 / ≥8 / 两次一致），文案全中文化（错误/提示皆人话）。
 *
 * 为什么在这里：登录界面与工作台合并成单一入口后（门户 2026-09-29 改造），
 * 页面上不再有任何退出/换账号入口；dsh 实例自身无账号体系，身份与退出都在
 * 门户侧。本组件占 `sidebar.footer.action` 槽（order 1：会话日志 5 与用量
 * 徽标 10 之上、远程图标行之下）；数据走同源 `GET /__portal/api/me`、退出走
 * `POST /logout`（机制与边界见 account-card.ts）。拉不到身份（非门户环境/
 * 未登录）时整块不渲染。
 *
 * 展示名（2026-09-30）：门户 `/__portal/api/me` 的 `displayName`（名册姓名，
 * 如「李六兵」）优先，缺名册回落 localpart；密码接口只用 username。
 * 侧栏折叠（宿主 frame 的 `data-sidebar-collapsed="true"`，56px 图标轨道）时
 * 只留头像——名字隐藏与菜单溢出释放规则在 base.css.ts（轨道里放不下，实测
 * 名字会把行撑到 87px 并左右溢出、菜单会被宿主列的 overflow:hidden 裁掉）。
 *
 * 刻意跨宽度（桌面也渲染）：客户用电脑浏览器（鼠标指针）经门户访问时同样
 * 需要退出入口，所以标记 `account` 不在 misc.css.ts 的桌面遮蔽名单里——
 * 这是 README「桌面 no-op」承诺的唯一例外（2026-09-29 用户要求）。
 *
 * 退出路径：fetch POST /logout → 门户清会话 → `location.replace('/')` 回到
 * 登录卡片（不新增历史条目，与单一入口语义一致）；fetch 失败走表单兜底
 * 导航（离线/网关抖动也不卡死）。
 */
export declare function AccountCard({ t }: PropsLocale<typeof NS>): import("react").JSX.Element | null;
//# sourceMappingURL=AccountCard.d.ts.map