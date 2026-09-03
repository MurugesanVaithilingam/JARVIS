[CmdletBinding()]
param()

try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]

    function Await-AsyncOperation($asyncOp, $type) {
        $m = $asTaskGeneric.MakeGenericMethod($type)
        $task = $m.Invoke($null, @($asyncOp))
        $task.Wait()
        return $task.Result
    }

    $accessOp = [Windows.Devices.Radios.Radio]::RequestAccessAsync()
    $access = Await-AsyncOperation $accessOp ([Windows.Devices.Radios.RadioAccessStatus])

    $radiosOp = [Windows.Devices.Radios.Radio]::GetRadiosAsync()
    $radios = Await-AsyncOperation $radiosOp ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]])

    $btRadio = $radios | Where-Object { $_.Kind -eq [Windows.Devices.Radios.RadioKind]::Bluetooth }

    if ($btRadio) {
        $setStateOp = $btRadio.SetStateAsync([Windows.Devices.Radios.RadioState]::On)
        $setStateTask = $asTaskGeneric.MakeGenericMethod([Windows.Devices.Radios.RadioAccessStatus]).Invoke($null, @($setStateOp))
        $setStateTask.Wait()
        Write-Output "SUCCESS: Bluetooth Turned ON"
    } else {
        Write-Output "NO_BT_RADIO"
    }
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
