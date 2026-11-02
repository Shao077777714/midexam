# 音效素材

此資料夾的 WAV 音效由本專案以程式合成製作，未使用外部錄音或第三方音源。檔案為 16 kHz、單聲道、16-bit PCM，適合在瀏覽器中以 Web Audio API 播放。

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