# 音效素材

原有 WAV 由本專案程式合成，16kHz單聲道16-bit PCM，保留原檔供回溯。本輪新增22.05kHz懸疑音景及外部生成的中文神經語音MP3，遊戲直接讀取本地音檔，不需玩家的語音服務帳號或金鑰。

## 2026-11-03 新版聲音

- `ambience/suspense-dream-v2.wav`、`suspense-weird-v2.wav`、`suspense-void-v2.wav`：各24秒原創合成音景，包含低頻拍動、金屬泛音與過濾雜訊；開頭與結尾淡至零避免爆音。由`../../../scripts/generate-soundscapes.py`產製，雜湊見`ambience/manifest-v2.json`。夢核低聲不安、怪核壓迫、黑暗走道亦有背景。
- `voice-v2/`：20段中文爸爸／回憶旁白MP3，由外部[edge-tts](https://github.com/rany2/edge-tts)程式使用Microsoft Edge線上神經語音服務產製，聲線`zh-TW-YunJheNeural`、語速-7%、音高不變。這是AI合成聲音，不是真人錄音，也不是複製ChatGPT助理的聲音。
- 完整文字與聲線設定見`voice-v2/scripts.json`；每段實際長度、來源、位元組及SHA-256見`voice-v2/manifest.json`。原五段錄音、完整連播與整段投影保留供歷史回溯，現行第四關只播memory-3通關結尾，不啟動整串錄音。六關結尾使用memory-0～5，播完才可開門。第五關使用projection-0～3，每段字幕與同文音檔一對一，以自然結束換段，四段時長3.36／6.6／5.928／10.92秒。2026-11-04新增5個音檔，原15檔未變更。
- 生成工具：`scripts/prepare-voice-scripts.mjs`、`scripts/generate-voices.py`，開發時依`scripts/requirements-voice.txt`安裝。重新生成才會連線外部服務；正式遊戲僅載入專案靜態音檔。
- 聲音控制：三條背景固定循環並交叉淡入淡出，旁白時背景降為24%；暫停／背景頁停止播放時鐘，恢復續播；靜音同時關閉可聽見的語音、機關聲與背景，必要旁白時序持續完整走完。檔案載入失敗則按同段完整時長顯示字幕，不退回瀏覽器朗讀。聲音自然度與情緒是否符合期望需另作主觀試聽。

## 檔案

- `ambience/dreamcore_loop.wav`：夢核柔和合成氛圍，可循環播放。
- `ambience/weirdcore_loop.wav`：怪核低頻、微失真氛圍，可循環播放。
- `puzzle/correct.wav`：謎題完成提示。
- `puzzle/retry.wav`：答案不符時的溫和重試提示。
- `corridor/child_laugh.wav`：第二關孩子笑聲線索（合成音效，非真人錄音）。
- `corridor/keys.wav`：第二關鑰匙聲線索。
- `corridor/argument.wav`：第二關爭吵聲線索（合成音效，沒有可辨識語句）。
- `corridor/unanswered_call.wav`：第二關未接來電線索。

## 使用建議

氛圍音可在夢核／怪核切換時淡入淡出；第二關線索音效應由對應房門播放，並保留字幕或文字提示。錯誤提示音保持低音量，避免蓋過語音或線索。
