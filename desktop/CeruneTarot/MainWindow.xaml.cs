using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace CeruneTarot;

public partial class MainWindow : Window
{
    public MainWindow() => InitializeComponent();

    private async void DrawButton_Click(object sender, RoutedEventArgs e)
    {
        DrawButton.IsEnabled = false;
        Results.Children.Clear();
        try
        {
            var exe = Path.Combine(AppContext.BaseDirectory, "native", "fortune.exe");
            if (!File.Exists(exe))
                throw new FileNotFoundException("先に scripts/build-native.ps1 を実行してください。", exe);

            var topic = ((ComboBoxItem)TopicBox.SelectedItem).Tag.ToString()!;
            var count = int.Parse(((ComboBoxItem)CountBox.SelectedItem).Tag.ToString()!, CultureInfo.InvariantCulture);
            var seed = RandomNumberGenerator.GetInt32(1, int.MaxValue);

            var info = new ProcessStartInfo(exe)
            {
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8,
                CreateNoWindow = true
            };
            info.ArgumentList.Add(seed.ToString(CultureInfo.InvariantCulture));
            info.ArgumentList.Add(count.ToString(CultureInfo.InvariantCulture));
            info.ArgumentList.Add(topic);

            using var process = Process.Start(info) ?? throw new InvalidOperationException("Cerune Nativeを起動できませんでした。");
            var stdoutTask = process.StandardOutput.ReadToEndAsync();
            var stderrTask = process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();
            var stdout = await stdoutTask;
            var stderr = await stderrTask;
            if (process.ExitCode != 0)
                throw new InvalidOperationException($"Cerune Nativeの実行に失敗しました。\n{stderr}");

            ShowReading(stdout, count);
        }
        catch (Exception ex)
        {
            AddLine(ex.Message);
        }
        finally
        {
            DrawButton.IsEnabled = true;
        }
    }

    private void ShowReading(string output, int count)
    {
        // Protocol: header, count, (id, name, orientation, interpretation, advice) * count, END.
        var lines = output.Replace("\r\n", "\n").TrimEnd('\n').Split('\n');
        if (lines.Length != 3 + count * 5 ||
            lines[0] != "CERUNE_TAROT_DRAW" ||
            lines[1] != count.ToString(CultureInfo.InvariantCulture) ||
            lines[^1] != "END")
            throw new InvalidDataException($"Cerune Nativeから予期しない出力を受け取りました。\n{output}");

        var positions = count == 1
            ? new[] { "あなたへのメッセージ" }
            : new[] { "過去", "現在", "未来" };

        for (var i = 0; i < count; i++)
        {
            var offset = 2 + i * 5;
            AddLine($"{positions[i]}：{lines[offset + 1]}（{lines[offset + 2]}）", true);
            AddLine(lines[offset + 3]);
            AddLine(lines[offset + 4]);
        }
    }

    private void AddLine(string value, bool heading = false)
    {
        Results.Children.Add(new TextBlock
        {
            Text = value,
            TextWrapping = TextWrapping.Wrap,
            FontSize = heading ? 16 : 14,
            FontWeight = heading ? FontWeights.SemiBold : FontWeights.Normal,
            Margin = heading ? new Thickness(0, 14, 0, 8) : new Thickness(0, 0, 0, 8)
        });
    }
}
