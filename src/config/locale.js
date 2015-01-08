app

.config(["localStorageServiceProvider", function(localStorageServiceProvider) {
	localStorageServiceProvider.setPrefix("Excel2Redmine");
}])

.config(["$translateProvider", function($translateProvider) {

	var zh_tw = {
		"Config": "設定",
		"Import": "匯入",
		"Version": "版本",

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

		"Connect to Redmine server failed, please check config.": "Redmine 連線失敗，請檢查相關設定。",
		"Import {{okcount}} issues successfully, {{errorcount}} failed.": "匯入 {{okcount}} 筆資料成功， {{errorcount}} 筆資料失敗",
		"Import nothing": "找不到可匯入的資料",
		"Unable to parse excel file, please check the file format is corrent.": "無法解析 Excel 檔案，請確認檔案格式是否正確。"
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
