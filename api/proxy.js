// Vercel Serverless Functionのエントリーポイント
// このファイルはプロジェクトの /api/proxy.js として配置してください。

export default async function handler(request, response) {
  // 安全対策：POSTリクエスト以外のアクセスは受け付けない
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // Vercelの環境変数から安全にAPIキーを取得します。
  const apiKey = process.env.GEMINI_API_KEY;

  // APIキーがVercelに設定されていない場合は、分かりやすいエラーを返します。
  if (!apiKey) {
    console.error("環境変数 'GEMINI_API_KEY' がVercelに設定されていません。");
    return response.status(500).json({ error: "サーバー側でAPIキーが設定されていません。Vercelのプロジェクト設定を確認してください。" });
  }

  try {
    // ウェブサイト（HTML側）から送られてきたプロンプト（指示文）を取得します。
    const { prompt } = request.body;
    if (!prompt) {
      return response.status(400).json({ error: 'リクエストにプロンプト（指示文）が含まれていません。' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // GoogleのGemini APIにリクエストを送信します。
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: prompt }]
        }]
      })
    });

    // Gemini APIからエラーが返ってきた場合の処理
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini APIからのエラーレスポンス:", errorText);
      throw new Error('Gemini APIとの通信に失敗しました。');
    }

    const geminiData = await geminiResponse.json();
    
    // Geminiからのレスポンスから、生成されたテキスト部分を安全に取り出します。
    const generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 成功した結果（生成されたテキスト）を、JSON形式でウェブサイトに返します。
    return response.status(200).json({ text: generatedText });

  } catch (error) {
    console.error('Vercel Function内でエラーが発生しました:', error.message);
    return response.status(500).json({ error: 'サーバー内部でエラーが発生しました。詳細はVercelのログを確認してください。' });
  }
}
