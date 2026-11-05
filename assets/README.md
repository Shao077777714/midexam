# 圖片與音效素材索引

遊戲實際載入與正式部署的圖片、音效保存在 `public/assets/`，遊戲以 `public` 作為靜態資源根目錄。`assets/reference-images/` 另存只供美術參考的原始圖片，不會部署到遊戲。`manifest.json` 分別列出可用遊戲素材、參考圖片及尚待製作的音效需求。

圖片尺寸、生成提示詞、來源與 SHA-256 以 `public/assets/dreamcore/README.md`、`PROMPTS.md`、`PROMPTS-v2.json` 及該目錄的 `manifest.json` 為準。音效用途與技術規格以 `public/assets/audio/README.md` 為準。`available` 代表素材檔案已存在，不保證每個素材都已在遊戲中使用或完成實機驗收；尚未製作的項目標示為 `planned`。

## 參考圖片

`reference-images/` 保存本次提供的 13 張原始 JPEG，檔名與影像位元組保持不變。這些圖只供美術討論與建模參考，不是遊戲執行素材，也不會由建置流程複製到 `public/` 或 `dist/`。每張圖的用途、原始檔名、尺寸、位元組數及 SHA-256 記錄在 `manifest.json` 的 `references` 陣列。

依使用者提供資訊，本批及既有風格參考圖的來源平台為 Pinterest；來源與圖片用途見根目錄 [credit.md](../credit.md)。其中若干檔案與既有九張 `references/visual-style/` 圖片或本批另一張圖片內容完全相同；為保留交付原始檔名，仍逐張保存。個別 Pinterest Pin、原始作者及授權資訊未提供，尚未確認公開再散布授權；正式遊戲素材或公開宣傳使用前需另行確認授權。
