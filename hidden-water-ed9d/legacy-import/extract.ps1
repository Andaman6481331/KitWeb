# Reads KIT Base.accdb (read-only) and writes staging/customers.json, products.json, sales.json,
# vat.json for build.mjs. Nothing is written back to Access.
# Run in 64-bit PowerShell:  powershell -File legacy-import\extract.ps1
param(
  [string]$Accdb = 'D:\Kitcharoen\KIT Base.accdb',
  [string]$From = '2025-10-13',
  [string]$To = '2026-10-13'
)
$ErrorActionPreference = 'Stop'
$out = Join-Path $PSScriptRoot 'staging'
New-Item -ItemType Directory -Force $out | Out-Null

$cn = New-Object -ComObject ADODB.Connection
$cn.Open("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$Accdb;Mode=Read")

function Export-Query($sql, $file) {
  $rs = $cn.Execute($sql)
  $n = $rs.Fields.Count
  $names = 0..($n - 1) | ForEach-Object { $rs.Fields.Item($_).Name }
  $list = New-Object System.Collections.Generic.List[object]
  if (-not $rs.EOF) {
    $rows = $rs.GetRows()
    $count = $rows.GetLength(1)
    for ($r = 0; $r -lt $count; $r++) {
      $o = [ordered]@{}
      for ($c = 0; $c -lt $n; $c++) {
        $v = $rows[$c, $r]
        if ($v -is [DBNull]) { $v = $null }
        elseif ($v -is [datetime]) { $v = $v.ToString('yyyy-MM-dd') }
        $o[$names[$c]] = $v
      }
      $list.Add($o)
    }
  }
  $json = ConvertTo-Json -InputObject $list.ToArray() -Depth 3 -Compress
  [IO.File]::WriteAllText((Join-Path $out $file), $json, (New-Object Text.UTF8Encoding($false)))
  Write-Output ("{0}: {1} rows" -f $file, $list.Count)
}

$f = [datetime]::Parse($From).ToString('MM/dd/yyyy'); $t = [datetime]::Parse($To).ToString('MM/dd/yyyy')
Export-Query "SELECT * FROM Customers" 'customers.json'
Export-Query "SELECT * FROM Products" 'products.json'
Export-Query "SELECT * FROM [Sell Transection] WHERE [Date] >= #$f# AND [Date] <= #$t#" 'sales.json'
Export-Query "SELECT OrderNo, VatBillNo, VatBillDate FROM [Vat Transection] WHERE VatBillDate >= #$f#" 'vat.json'
$cn.Close()
