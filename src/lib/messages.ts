/**
 * 共通文言定数
 * 
 * UIで使用するテキストを一元管理するモジュール。
 * 文言の一貫性維持とi18n対応の土台として機能する。
 * 
 * @module lib/messages
 */

/**
 * トーストメッセージ定数
 * 
 * ユーザーへのフィードバック表示に使用する文言を定義。
 * 成功・エラー・情報の3カテゴリに分類。
 */
export const TOAST_MESSAGES = {
    // === 成功メッセージ ===
    /** 記録保存成功時 */
    SAVE_SUCCESS: '記録しました',
    /** 下書き保存成功時 */
    DRAFT_SAVED: '下書きとして保存しました',
    /** 下書き読み込み成功時 */
    DRAFT_LOADED: '下書きを読み込みました',
    /** 下書き削除成功時 */
    DRAFT_DELETED: '下書きを削除しました',
    /** My Menu登録成功時 */
    FAVORITE_SAVED: 'My Menuに登録しました',
    /** お気に入り削除成功時 */
    FAVORITE_DELETED: '削除しました',
    /** 設定保存成功時 */
    SETTINGS_SAVED: '設定を保存しました',
    /** 写真解析成功時 */
    PHOTO_ANALYZED: '写真を解析しました',
    /** テキスト解析成功時 */
    TEXT_ANALYZED: 'テキストを解析しました',
    /**
     * 体重測定完了時のメッセージを生成
     * @param weight - 測定した体重 (kg)
     * @returns フォーマット済みメッセージ
     */
    WEIGHT_MEASURED: (weight: number) => `測定完了: ${weight}kg`,
    /** 体組成データ推定完了時 */
    METRICS_CALCULATED: '全10項目の体組成データを推定しました',

    // === エラーメッセージ ===
    /** ログイン必須エラー */
    LOGIN_REQUIRED: 'ログインが必要です',
    /** 保存失敗エラー */
    SAVE_FAILED: '保存に失敗しました',
    /** 削除失敗エラー */
    DELETE_FAILED: '削除に失敗しました',
    /** 更新失敗エラー */
    UPDATE_FAILED: '更新に失敗しました',
    /** 読み込み失敗エラー */
    LOAD_FAILED: '読み込みに失敗しました',
    /** 解析失敗エラー */
    ANALYSIS_FAILED: '解析エラーが発生しました',
    /** 通信エラー */
    NETWORK_ERROR: '通信エラーが発生しました',
    /** 画像読み込み失敗エラー */
    IMAGE_LOAD_FAILED: '画像の読み込みに失敗しました',
    /** 接続失敗エラー */
    CONNECTION_FAILED: '接続できませんでした',
    /** AIレート制限エラー */
    AI_RATE_LIMIT: 'AIの利用制限に達しました',
    /** AIレート制限の詳細説明 */
    AI_RATE_LIMIT_DESC: 'しばらく時間を空けてから再試行してください。',
    /** お気に入り取得失敗エラー */
    FAVORITE_LOAD_FAILED: 'My Menuの取得に失敗しました',
    /** メニュー読み込み失敗エラー */
    MENU_LOAD_FAILED: 'メニューの内容を読み込めませんでした',

    // === 情報メッセージ ===
    /** 体重データ待機中 */
    WAITING_FOR_DATA: 'データ待機中... 体重計に乗ってください',
    /** Bluetooth接続中 */
    CONNECTING: '接続中... (Chocozap対応)',
    /**
     * My Menuからの読み込み件数を表示
     * @param count - 読み込んだ件数
     * @returns フォーマット済みメッセージ
     */
    FAVORITE_ITEMS_LOADED: (count: number) => `My Menuから${count}件読み込みました`,
    /**
     * My Menuからの読み込み完了メッセージを生成
     * @param name - メニュー名
     * @returns フォーマット済みメッセージ
     */
    MENU_LOADED: (name: string) => `My Menuから「${name}」を読み込みました`,
} as const;

/**
 * バリデーションメッセージ定数
 * 
 * フォーム入力値の検証エラー時に表示する文言。
 */
export const VALIDATION_MESSAGES = {
    /** 体重未入力エラー */
    WEIGHT_REQUIRED: '体重を入力してください',
    /** 運動種目名未入力エラー */
    EXERCISE_NAME_REQUIRED: '種目名を入力してください',
    /** 内容空エラー */
    CONTENT_EMPTY: '内容が空です',
} as const;

/**
 * プレースホルダー定数
 * 
 * 入力フィールドのプレースホルダーテキスト。
 * ユーザーに入力例を示す。
 */
export const PLACEHOLDERS = {
    /** 食事入力の例文 */
    MEAL_EXAMPLE: '例: ライスSとハンバーグ定食、コーラ1杯',
    /** 運動入力の音声ガイド */
    EXERCISE_EXAMPLE: '「ベンチプレス60kgを10回3セット」のように話してください',
    /** 運動種目名の入力例 */
    EXERCISE_NAME: '例: ベンチプレス',
} as const;

/**
 * ページタイトル定数
 * 
 * 各ページのヘッダーに表示するタイトル。
 */
export const PAGE_TITLES = {
    /** 食事記録ページ */
    MEAL_LOG: '食事を記録',
    /** 運動記録ページ */
    EXERCISE_LOG: '運動を記録',
    /** 体重記録ページ */
    WEIGHT_LOG: '体重を記録',
    /** 設定ページ */
    SETTINGS: '設定',
} as const;

/**
 * タブラベル定数
 * 
 * ログページ内のタブ切り替えに使用するラベル。
 */
export const TAB_LABELS = {
    /** 写真タブ */
    PHOTO: '写真',
    /** 音声・手入力タブ */
    VOICE_INPUT: '音声・手入力',
    /** 音声タブ */
    VOICE: '音声',
    /** 手入力タブ */
    MANUAL: '手入力',
} as const;

/**
 * セクション見出し定数
 * 
 * 画面内の各セクションに表示する見出しテキスト。
 */
export const SECTION_TITLES = {
    /** 今日の食事セクション */
    TODAYS_MEALS: '今日の食事',
    /** 今日の運動セクション */
    TODAYS_EXERCISES: '今日の運動',
    /** 栄養バランスセクション */
    NUTRITION_BALANCE: '栄養バランス',
    /** 体組成データセクション */
    BODY_COMPOSITION: '体組成データ',
    /** 記録メニューセクション */
    MENU_TO_RECORD: '記録するメニュー',
    /** 下書きセクション */
    DRAFTS: '下書き (再開)',
    /** 再試行可能な下書きセクション */
    RETRYABLE_DRAFTS: '再試行可能な下書き',
} as const;

/**
 * ボタンラベル定数
 * 
 * 各種ボタンに表示するテキスト。
 */
export const BUTTON_LABELS = {
    /** 保存ボタン */
    SAVE: '保存',
    /** 記録ボタン */
    RECORD: '記録する',
    /** 解析ボタン */
    ANALYZE: '解析',
    /** 下書きボタン */
    DRAFT: '下書き',
    /** キャンセルボタン */
    CANCEL: 'キャンセル',
    /** 削除ボタン */
    DELETE: '削除する',
    /** ログアウトボタン */
    LOGOUT: 'ログアウト',
    /** 続けて記録ボタン */
    CONTINUE_RECORD: '続けて記録',
    /** 続けて下書きボタン */
    CONTINUE_DRAFT: '続けて下書き',
    /** ダッシュボードへボタン */
    GO_TO_DASHBOARD: 'ダッシュボードへ',
    /** カメラ起動ボタン */
    CAMERA_START: 'カメラ起動',
    /** 音声開始ボタン */
    VOICE_START: '音声',
    /** 音声停止ボタン */
    VOICE_STOP: '停止',
    /** My Menuから選択ボタン */
    SELECT_FROM_MENU: 'My Menuから選択',
    /** My Menuに登録ボタン */
    ADD_TO_MENU: 'My Menuに登録',
} as const;

/**
 * ダイアログメッセージ定数
 * 
 * モーダルダイアログに表示するタイトル・説明文。
 */
export const DIALOG_MESSAGES = {
    /** 下書き削除ダイアログタイトル */
    DELETE_DRAFT_TITLE: '下書きを削除',
    /** 下書き削除ダイアログ説明 */
    DELETE_DRAFT_DESC: 'この下書きを削除してもよろしいですか？',
    /** 記録完了ダイアログタイトル */
    RECORD_COMPLETE_TITLE: '記録しました！',
    /** 下書き保存完了ダイアログタイトル */
    DRAFT_COMPLETE_TITLE: '下書き保存しました',
    /** 続けて記録の説明 */
    CONTINUE_RECORD_DESC: '続けて記録しますか？それともダッシュボードに戻りますか？',
    /** 続けて下書きの説明 */
    CONTINUE_DRAFT_DESC: '続けて他の項目も下書きしますか？',
    /** ログタイプ選択ダイアログタイトル */
    SELECT_LOG_TYPE_TITLE: '何を記録しますか？',
    /** ログタイプ選択ダイアログ説明 */
    SELECT_LOG_TYPE_DESC: '記録したい内容を選択してください。',
} as const;

/**
 * 栄養素ラベル定数
 * 
 * 栄養素の表示名。
 */
export const NUTRIENT_LABELS = {
    /** タンパク質 */
    PROTEIN: 'タンパク質',
    /** 脂質 */
    FAT: '脂質',
    /** 炭水化物 */
    CARBS: '炭水化物',
    /** 食物繊維 */
    FIBER: '食物繊維',
    /** 塩分 */
    SALT: '塩分',
    /** カロリー */
    CALORIES: 'カロリー',
} as const;

/**
 * 時間帯ラベル定数
 * 
 * 食事の時間帯区分の表示名。
 */
export const TIME_SLOT_LABELS = {
    /** 朝 */
    morning: '朝',
    /** 昼 */
    afternoon: '昼',
    /** 夜 */
    night: '夜',
} as const;

/**
 * 空状態メッセージ定数
 * 
 * データが存在しない場合に表示するメッセージとヒント。
 */
export const EMPTY_STATE = {
    /** 食事記録なしメッセージ */
    NO_MEALS: 'まだ記録がありません',
    /** 食事記録なしヒント */
    NO_MEALS_HINT: '最初の食事を記録してみましょう',
    /** 運動記録なしメッセージ */
    NO_EXERCISES: 'まだ運動の記録がありません',
    /** 運動記録なしヒント */
    NO_EXERCISES_HINT: '運動を記録してみましょう',
    /** お気に入りなしメッセージ */
    NO_FAVORITES: 'My Menuはまだありません',
    /** お気に入りなしヒント */
    NO_FAVORITES_HINT: '記録画面の「My Menuに保存」チェックONで追加できます',
} as const;
