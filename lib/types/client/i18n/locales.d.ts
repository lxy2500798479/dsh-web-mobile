/** `mobileNav` namespace dictionaries: drawer controls. */
export declare const NS = "mobileNav";
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: {
    readonly open: "打开目录";
    readonly close: "收起目录";
    readonly backdrop: "点击关闭目录";
    readonly backToConversation: "返回会话";
    readonly sessionLog: "导出会话日志";
    readonly accountLabel: "账号：{name}";
    readonly accountPassword: "修改密码";
    readonly logout: "退出登录";
    readonly loggingOut: "正在退出…";
    readonly passwordTitle: "修改密码";
    readonly passwordOld: "当前密码";
    readonly passwordNew: "新密码（至少 8 位）";
    readonly passwordConfirm: "确认新密码";
    readonly passwordSubmit: "确认修改";
    readonly passwordSubmitting: "提交中…";
    readonly passwordCancel: "取消";
    readonly passwordUpdated: "密码已更新";
    readonly passwordFillAll: "请把三栏都填上";
    readonly passwordTooShort: "新密码至少 8 位";
    readonly passwordMismatch: "两次输入的新密码不一致";
    readonly passwordFailed: "修改失败，请重试";
    readonly files: "文件浏览";
    readonly fileUpload: "添加文件";
    readonly download: "下载";
    readonly downloadTooLarge: "文件过大，无法直接下载";
    readonly downloadMissing: "文件不存在或已被删除";
    readonly downloadFailed: "下载失败，请重试";
    readonly downloadStarted: "已开始下载：{name}";
    readonly downloadShared: "已保存或已分享：{name}";
    readonly previewFullscreen: "全屏预览";
    readonly previewExitFullscreen: "退出全屏";
    readonly htmlPreviewFrame: "HTML 交互预览";
    readonly deleteSession: "删除会话";
    readonly deleteConfirmTitle: "删除会话？";
    readonly deleteConfirmDesc: "将删除「{title}」的完整会话记录，此操作不可恢复。";
    readonly deleteConfirmYes: "删除";
    readonly deleteConfirmNo: "取消";
    readonly deletePending: "正在删除…";
    readonly deleteErrorBusy: "该会话正在运行且无法停止，请稍后重试。";
    readonly deleteErrorNotFound: "会话不存在或已被删除。";
    readonly deleteErrorResolve: "无法确定要删除的会话，请重试。";
    readonly deleteErrorGeneric: "删除失败：{message}";
};
/** English dictionary, key-identical to the Chinese source of truth. */
export declare const en: Record<MobileNavKey, string>;
/** Key domain of the `mobileNav` namespace (zh is the source of truth). */
export type MobileNavKey = keyof typeof zh;
//# sourceMappingURL=locales.d.ts.map