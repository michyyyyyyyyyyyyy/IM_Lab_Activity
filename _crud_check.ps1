
$ErrorActionPreference = 'Continue'
$base = 'http://localhost/IM_Lab_Activity'
$jar = "$env:TEMP\findit_crud.txt"
Remove-Item $jar -ErrorAction SilentlyContinue

function PostJson($url, $obj) {
  $file = "$env:TEMP\findit_body.json"
  $obj | ConvertTo-Json -Compress | Set-Content -Path $file -Encoding ascii
  curl.exe -s -b $jar -c $jar -H "Content-Type: application/json" --data-binary "@$file" $url
  Write-Output ""
}

Write-Output 'LOGIN STUDENT'
PostJson "$base/api/auth/login.php" @{ identifier = 'alex.santos@example.com'; password = 'Password123' }

Write-Output 'DASH'
curl.exe -s -b $jar "$base/api/dashboard.php"
Write-Output ""

Write-Output 'CREATE'
$create = "$env:TEMP\findit_create.json"
'{"name":"Blue Umbrella","category":"Other","description":"A blue umbrella with a wooden handle found near the chapel steps.","date":"2026-11-18","location":"Chapel","type":"found"}' | Set-Content $create -Encoding ascii
curl.exe -s -b $jar -c $jar -H "Content-Type: application/json" --data-binary "@$create" "$base/api/items.php"
Write-Output ""

Write-Output 'UPDATE'
$upd = "$env:TEMP\findit_upd.json"
'{"id":"ITM-0001","location":"HCDC Library"}' | Set-Content $upd -Encoding ascii
curl.exe -s -b $jar -c $jar -X PUT -H "Content-Type: application/json" --data-binary "@$upd" "$base/api/items.php"
Write-Output ""

Write-Output 'CLAIM'
$claim = "$env:TEMP\findit_claim.json"
'{"itemId":"ITM-0002","note":"The flask has a faded crusaders sticker on the side."}' | Set-Content $claim -Encoding ascii
curl.exe -s -b $jar -c $jar -H "Content-Type: application/json" --data-binary "@$claim" "$base/api/claims.php"
Write-Output ""

Write-Output 'MY CLAIMS'
curl.exe -s -b $jar "$base/api/claims.php?mine=1"
Write-Output ""
