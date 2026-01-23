# XMLファイルからテキストを抽出するスクリプト
$xmlFile = Get-ChildItem -Filter "*.xml" | Select-Object -First 1

if (-not $xmlFile) {
    Write-Host "XMLファイルが見つかりません"
    exit 1
}

Write-Host "ファイル: $($xmlFile.Name)"
Write-Host "サイズ: $([math]::Round($xmlFile.Length/1MB, 2)) MB"
Write-Host ""

# XMLファイルを読み込む
$xmlContent = [System.IO.File]::ReadAllText($xmlFile.FullName, [System.Text.Encoding]::UTF8)

# <w:t>タグ内のテキストを抽出
$textPattern = '<w:t[^>]*>([^<]*)</w:t>'
$matches = [regex]::Matches($xmlContent, $textPattern)

Write-Host "見つかったテキスト要素数: $($matches.Count)"
Write-Host ""

# テキストを結合
$allText = ""
foreach ($match in $matches) {
    $allText += $match.Groups[1].Value
}

Write-Host "総文字数: $($allText.Length)"
Write-Host ""

# キーワードを検索
$keywords = @("ステップ", "日目", "ワーク", "シート", "コーチング", "プログラム", "7日間", "28日間", "自分を変える")

Write-Host ("=" * 80)
Write-Host "キーワード検索結果"
Write-Host ("=" * 80)

foreach ($keyword in $keywords) {
    $keywordMatches = [regex]::Matches($allText, [regex]::Escape($keyword))
    if ($keywordMatches.Count -gt 0) {
        Write-Host ""
        Write-Host "【$keyword】が見つかりました ($($keywordMatches.Count)箇所)"
        
        # 最初の3つのマッチの前後100文字を表示
        $count = 0
        foreach ($match in $keywordMatches) {
            if ($count -ge 3) { break }
            $start = [Math]::Max(0, $match.Index - 100)
            $end = [Math]::Min($allText.Length, $match.Index + $match.Length + 100)
            $context = $allText.Substring($start, $end - $start)
            Write-Host ""
            Write-Host "  マッチ $($count + 1) (位置 $($match.Index)):"
            Write-Host "  ...$context..."
            $count++
        }
    }
}

Write-Host ""
Write-Host ("=" * 80)
Write-Host "ファイルの先頭部分（最初の2000文字）"
Write-Host ("=" * 80)
Write-Host $allText.Substring(0, [Math]::Min(2000, $allText.Length))

Write-Host ""
Write-Host ("=" * 80)
Write-Host "ファイルの末尾部分（最後の2000文字）"
Write-Host ("=" * 80)
Write-Host $allText.Substring([Math]::Max(0, $allText.Length - 2000))
