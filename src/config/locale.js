app

.config(["localStorageServiceProvider", function(localStorageServiceProvider) {
	localStorageServiceProvider.setPrefix("Excel2Redmine");
}])

.config(["$translateProvider", function($translateProvider) {

	var zh_tw = {
		"Cancel": "取消",
		"Check": "檢查",
		"Config": "設定",
		"Import": "匯入",
		"OK": "確定",
		"Version": "版本",
		"Basic config": "基本設定",
		"Extra config": "額外設定",
		"Import field default value": "匯入欄位預設值",
		"Built-in field": "內建欄位",
		"Custom field": "自訂欄位",
		"Default value": "預設值",

		// key
		"subject": "主旨",
		"description": "概述",
		// enum
		"tracker_id": "追蹤標籤",
		"status_id": "狀態",
		"priority_id": "優先權",
		// date
		"start_date": "開始日期",
		"due_dae": "完成日期",

		"Check {{okcount}} issues successfully, {{errorcount}} failed, {{existcount}} issues existed.": "檢查 {{okcount}} 筆資料成功， {{errorcount}} 筆資料失敗，其中 {{existcount}} 筆資料已存在",
		"Check nothing": "找不到可檢查的資料",
		"Check Redmine Custom Field List": "檢查 Redmine 自定義欄位",
		"Connect to Redmine server failed, please check config.": "Redmine 連線失敗，請檢查相關設定。",
		"Import {{okcount}} issues successfully, {{errorcount}} failed.": "匯入 {{okcount}} 筆資料成功， {{errorcount}} 筆資料失敗",
		"Import nothing": "找不到可匯入的資料",
		"Select excel file": "選擇 Excel 檔案",
		"Unable to parse excel file, please check the file format is corrent.": "無法解析 Excel 檔案，請確認檔案格式是否正確。",
		"Unknown ERROR, please post the following message to Github Issue": "未知的錯誤，請將下列訊息提交到 Github Issue 頁面",
		"User guide": "使用者說明文件"
	};

	$translateProvider.translations("zh_tw", zh_tw);
	$translateProvider.translations("zh_TW", zh_tw);

	$translateProvider
	.registerAvailableLanguageKeys(["zh_tw"], {
		"zh*": "zh_tw"
	})
	.useStorage("localStorageService")
	.determinePreferredLanguage();

}])

;
