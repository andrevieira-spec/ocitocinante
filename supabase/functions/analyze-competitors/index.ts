import "https://deno.land/x/xhr@0.1.0/mod.ts";

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para buscar dados REAIS do Google Trends via scraping direto (GRÁTIS)
async function fetchRealGoogleTrends(keywords: string[] = ['turismo Brasil', 'viagem Brasil', 'pacotes turismo']): Promise<any> {
  try {
    console.log('🔍 Buscando dados REAIS do Google Trends via scraping direto...');
    
    const results: any = {
      timestamp: new Date().toISOString(),
      keywords: [],
      destinations: [],
      trending_now: []
    };

    // Scraping direto do Google Trends (sem SerpAPI)
    for (const keyword of keywords) {
      try {
        // Buscar widget token primeiro
        const exploreUrl = `https://trends.google.com/trends/api/explore?hl=pt-BR&tz=-180&req={"comparisonItem":[{"keyword":"${encodeURIComponent(keyword)}","geo":"BR","time":"today 12-m"}],"category":67,"property":""}`;
        
        const exploreResponse = await fetch(exploreUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'pt-BR,pt;q=0.9'
          }
        });

        if (!exploreResponse.ok) {
          console.error(`❌ Google Trends explore erro ${exploreResponse.status} para "${keyword}"`);
          continue;
        }

        const exploreText = await exploreResponse.text();
        const exploreJson = JSON.parse(exploreText.replace(/^\)\]\}'\n/, ''));
        const token = exploreJson?.widgets?.[0]?.token;

        if (!token) {
          console.error(`❌ Token não encontrado para "${keyword}"`);
          continue;
        }

        // Buscar dados reais com o token
        const dataUrl = `https://trends.google.com/trends/api/widgetdata/multiline?hl=pt-BR&tz=-180&req={"time":"today 12-m","resolution":"WEEK","locale":"pt-BR","comparisonItem":[{"geo":"BR","keyword":"${encodeURIComponent(keyword)}"}],"requestOptions":{"property":"","backend":"IZG","category":67}}&token=${token}`;
        
        const dataResponse = await fetch(dataUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://trends.google.com/'
          }
        });

        if (dataResponse.ok) {
          const dataText = await dataResponse.text();
          const dataJson = JSON.parse(dataText.replace(/^\)\]\}'\n/, ''));
          
          if (dataJson?.default?.timelineData) {
            const values = dataJson.default.timelineData.map((item: any) => item.value[0] || 0);
            const avgValue = Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length);
            const maxValue = Math.max(...values);
            
            results.keywords.push({
              keyword: keyword,
              avg_interest: avgValue,
              max_interest: maxValue,
              trend: values[values.length - 1] > values[0] ? 'up' : 'down'
            });
            
            console.log(`✅ ${keyword}: ${avgValue} pontos (scraping real)`);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting importante
      } catch (error) {
        console.error(`❌ Erro ao buscar "${keyword}":`, error);
      }
    }

    // Buscar destinos em alta (top travel destinations Brasil)
    const travelDestinations = [
      'Gramado', 'Fernando de Noronha', 'Porto de Galinhas', 
      'Bonito', 'Campos do Jordão', 'Jericoacoara', 'Maragogi',
      'Arraial do Cabo', 'Chapada Diamantina', 'Foz do Iguaçu'
    ];

    for (const dest of travelDestinations) {
      try {
        const exploreUrl = `https://trends.google.com/trends/api/explore?hl=pt-BR&tz=-180&req={"comparisonItem":[{"keyword":"${encodeURIComponent(dest)}","geo":"BR","time":"today 3-m"}],"category":67,"property":""}`;
        
        const exploreResponse = await fetch(exploreUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
          }
        });

        if (exploreResponse.ok) {
          const exploreText = await exploreResponse.text();
          const exploreJson = JSON.parse(exploreText.replace(/^\)\]\}'\n/, ''));
          const token = exploreJson?.widgets?.[0]?.token;

          if (token) {
            const dataUrl = `https://trends.google.com/trends/api/widgetdata/multiline?hl=pt-BR&tz=-180&req={"time":"today 3-m","resolution":"WEEK","locale":"pt-BR","comparisonItem":[{"geo":"BR","keyword":"${encodeURIComponent(dest)}"}],"requestOptions":{"property":"","backend":"IZG","category":67}}&token=${token}`;
            
            const dataResponse = await fetch(dataUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://trends.google.com/'
              }
            });

            if (dataResponse.ok) {
              const dataText = await dataResponse.text();
              const dataJson = JSON.parse(dataText.replace(/^\)\]\}'\n/, ''));
              
              if (dataJson?.default?.timelineData) {
                const values = dataJson.default.timelineData.map((item: any) => item.value[0] || 0);
                const avgValue = Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length);
                
                if (avgValue > 10) {
                  results.destinations.push({
                    name: dest,
                    interest_score: avgValue,
                    relative_searches: Math.round(avgValue * 1.5)
                  });
                }
              }
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Erro ao buscar destino ${dest}:`, error);
      }
    }

    // Ordenar destinos por interesse
    results.destinations.sort((a: any, b: any) => b.interest_score - a.interest_score);
    results.destinations = results.destinations.slice(0, 5);
    
    console.log('✅ Dados REAIS do Google Trends (scraping direto):', {
      keywords: results.keywords.length,
      destinations: results.destinations.length,
      topDestination: results.destinations[0]?.name
    });

    return results.keywords.length > 0 || results.destinations.length > 0 ? results : null;
  } catch (error) {
    console.error('❌ Erro ao buscar Google Trends real:', error);
    return null;
  }
}

// YouTube Data API v3 - Buscar dados reais de vídeos
async function fetchYouTubeData(youtubeUrl: string, apiKey: string) {
  try {
    // Extrair channel ID ou username da URL
    const channelMatch = youtubeUrl.match(/youtube\.com\/(channel\/|c\/|@|user\/)([^/?]+)/);
    if (!channelMatch) {
      console.error('❌ URL do YouTube inválida');
      return null;
    }

    let channelId = '';
    const identifier = channelMatch[2];

    console.log(`📺 Buscando dados do YouTube para: ${identifier}`);

    // Se for @username, buscar o channel ID primeiro
    if (youtubeUrl.includes('/@')) {
      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(identifier)}&key=${apiKey}`
      );
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        channelId = searchData.items?.[0]?.id?.channelId || '';
      }
    } else if (youtubeUrl.includes('/channel/')) {
      channelId = identifier;
    } else {
      // Buscar por username
      const channelsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${identifier}&key=${apiKey}`
      );
      
      if (channelsResponse.ok) {
        const channelsData = await channelsResponse.json();
        channelId = channelsData.items?.[0]?.id || '';
      }
    }

    if (!channelId) {
      console.error('❌ Channel ID não encontrado');
      return null;
    }

    // Buscar dados do canal
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`
    );

    if (!channelResponse.ok) {
      console.error(`❌ YouTube API erro ${channelResponse.status}`);
      return null;
    }

    const channelData = await channelResponse.json();
    const channel = channelData.items?.[0];

    if (!channel) {
      console.error('❌ Canal não encontrado');
      return null;
    }

    // Buscar vídeos recentes
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
    
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=10&key=${apiKey}`
    );

    if (!videosResponse.ok) {
      console.error(`❌ YouTube videos erro ${videosResponse.status}`);
      return null;
    }

    const videosData = await videosResponse.json();
    const videoIds = videosData.items?.map((item: any) => item.snippet?.resourceId?.videoId).filter(Boolean).join(',');

    // Buscar estatísticas dos vídeos
    const statsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${apiKey}`
    );

    let videoStats: any[] = [];
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      videoStats = statsData.items || [];
    }

    // Montar dados dos vídeos
    const videos = videosData.items?.map((item: any, index: number) => {
      const videoId = item.snippet?.resourceId?.videoId;
      const stats = videoStats.find((v: any) => v.id === videoId);
      
      return {
        id: videoId,
        title: item.snippet?.title || '',
        description: item.snippet?.description?.substring(0, 300) || '',
        published_at: item.snippet?.publishedAt,
        thumbnail: item.snippet?.thumbnails?.medium?.url || '',
        video_url: `https://www.youtube.com/watch?v=${videoId}`,
        views: parseInt(stats?.statistics?.viewCount || '0'),
        likes: parseInt(stats?.statistics?.likeCount || '0'),
        comments: parseInt(stats?.statistics?.commentCount || '0'),
        duration: stats?.contentDetails?.duration || '',
        engagement: parseInt(stats?.statistics?.likeCount || '0') + parseInt(stats?.statistics?.commentCount || '0')
      };
    }) || [];

    const subscribers = parseInt(channel.statistics?.subscriberCount || '0');
    const totalViews = parseInt(channel.statistics?.viewCount || '0');
    const videoCount = parseInt(channel.statistics?.videoCount || '0');
    
    const totalEngagement = videos.reduce((sum: number, v: any) => sum + v.engagement, 0);
    const avgEngagementRate = subscribers > 0 ? ((totalEngagement / videos.length) / subscribers * 100).toFixed(2) : '0';

    console.log(`✅ YouTube scraped: ${videos.length} vídeos, ${subscribers.toLocaleString()} inscritos, ${avgEngagementRate}% engajamento`);

    return {
      channel: {
        id: channelId,
        title: channel.snippet?.title || '',
        description: channel.snippet?.description || '',
        custom_url: channel.snippet?.customUrl || '',
        published_at: channel.snippet?.publishedAt,
        thumbnail: channel.snippet?.thumbnails?.medium?.url || '',
        subscribers_count: subscribers,
        video_count: videoCount,
        total_views: totalViews,
        avg_engagement_rate: avgEngagementRate
      },
      videos: videos
    };
  } catch (error) {
    console.error('❌ Erro ao buscar dados do YouTube:', error);
    return null;
  }
}

// Retry logic for API calls
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = initialDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
}

// X (Twitter) API v2 integration
async function fetchXUserData(username: string, bearerToken: string) {
  try {
    // Remove @ if present and get clean username
    const cleanUsername = username.replace(/^@/, '').split('/').pop()?.trim();
    if (!cleanUsername) return null;

    console.log(`🐦 Fetching X data for: ${cleanUsername}`);

    // Get user ID first
    const userResponse = await fetch(
      `https://api.x.com/2/users/by/username/${cleanUsername}`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!userResponse.ok) {
      console.error(`X API user lookup error: ${userResponse.status}`);
      return null;
    }

    const userData = await userResponse.json();
    const userId = userData.data?.id;

    if (!userId) return null;

    // Get user tweets with metrics
    const tweetsResponse = await fetch(
      `https://api.x.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,public_metrics,entities&expansions=attachments.media_keys&media.fields=type,url`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!tweetsResponse.ok) {
      console.error(`X API tweets error: ${tweetsResponse.status}`);
      return null;
    }

    const tweetsData = await tweetsResponse.json();
    
    console.log(`✅ Retrieved ${tweetsData.data?.length || 0} tweets from X`);
    
    return {
      user: userData.data,
      tweets: tweetsData.data || [],
      includes: tweetsData.includes || {}
    };
  } catch (error) {
    console.error('Error fetching X data:', error);
    return null;
  }
}

// Instagram Web Scraping (sem API - scraping público)
async function fetchInstagramData(instagramUrl: string) {
  try {
    const match = instagramUrl.match(/instagram\.com\/([^/?]+)/);
    if (!match) return null;

    const username = match[1];
    console.log(`📸 Scraping Instagram (público) para: ${username}`);

    // Scraping da página pública do Instagram (simula navegador)
    const response = await fetch(`https://www.instagram.com/${username}/?__a=1&__d=dis`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });

    if (!response.ok) {
      console.error(`❌ Instagram scraping erro ${response.status} para ${username}`);
      // Fallback: scraping via HTML parsing
      return await scrapeInstagramViaHTML(username);
    }

    const data = await response.json();
    const user = data?.graphql?.user || data?.data?.user;

    if (!user) {
      console.log('⚠️ Instagram retornou dados vazios, tentando HTML scraping...');
      return await scrapeInstagramViaHTML(username);
    }

    // Extrair posts recentes e calcular engajamento
    const posts = user.edge_owner_to_timeline_media?.edges || [];
    const media = posts.slice(0, 12).map((edge: any) => {
      const node = edge.node;
      const likes = node.edge_liked_by?.count || 0;
      const comments = node.edge_media_to_comment?.count || 0;
      
      return {
        id: node.id,
        caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
        media_type: node.__typename === 'GraphVideo' ? 'VIDEO' : 'IMAGE',
        permalink: `https://www.instagram.com/p/${node.shortcode}/`,
        timestamp: new Date(node.taken_at_timestamp * 1000).toISOString(),
        like_count: likes,
        comments_count: comments,
        engagement: likes + comments
      };
    });

    const followers = user.edge_followed_by?.count || 0;
    const totalEngagement = media.reduce((sum: number, post: any) => sum + post.engagement, 0);
    const avgEngagementRate = followers > 0 ? ((totalEngagement / media.length) / followers * 100).toFixed(2) : '0';

    console.log(`✅ Instagram scraped: ${media.length} posts, ${followers} seguidores, ${avgEngagementRate}% engajamento`);
    
    return {
      account: {
        username: user.username,
        full_name: user.full_name,
        followers_count: followers,
        following_count: user.edge_follow?.count || 0,
        posts_count: user.edge_owner_to_timeline_media?.count || 0,
        biography: user.biography,
        profile_pic_url: user.profile_pic_url_hd,
        avg_engagement_rate: avgEngagementRate
      },
      media: media
    };
  } catch (error) {
    console.error('❌ Erro ao fazer scraping do Instagram:', error);
    return null;
  }
}

// Fallback: scraping via HTML quando JSON API não funciona
async function scrapeInstagramViaHTML(username: string) {
  try {
    console.log(`🔄 Tentando HTML scraping para @${username}...`);
    
    const response = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      console.error(`❌ HTML scraping falhou: ${response.status}`);
      return null;
    }

    const html = await response.text();
    
    // Extrair dados do JSON embutido no HTML
    const scriptMatch = html.match(/<script type="application\/ld\+json">({[\s\S]*?})<\/script>/);
    if (scriptMatch) {
      const jsonData = JSON.parse(scriptMatch[1]);
      
      return {
        account: {
          username: username,
          full_name: jsonData.name || username,
          followers_count: 0, // Não disponível no schema público
          biography: jsonData.description || '',
          avg_engagement_rate: 'N/A'
        },
        media: []
      };
    }

    console.log('⚠️ Instagram scraping: dados limitados (perfil privado ou bloqueio)');
    return null;
  } catch (error) {
    console.error('❌ Erro no HTML scraping:', error);
    return null;
  }
}

// TikTok Web Scraping (sem API - scraping público)
async function fetchTikTokData(tiktokUrl: string) {
  try {
    const match = tiktokUrl.match(/tiktok\.com\/@([^/?]+)/);
    if (!match) return null;

    const username = match[1];
    console.log(`🎵 Scraping TikTok (público) para: @${username}`);

    // TikTok tem proteção contra scraping, usar API pública não oficial
    const response = await fetch(`https://www.tiktok.com/@${username}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });

    if (!response.ok) {
      console.error(`❌ TikTok scraping erro ${response.status} para @${username}`);
      return null;
    }

    const html = await response.text();
    
    // TikTok embute dados em <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">
    const scriptMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/);
    
    if (scriptMatch) {
      try {
        const data = JSON.parse(scriptMatch[1]);
        const userData = data?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.user;
        const videoList = data?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.itemList || [];

        if (!userData) {
          console.log('⚠️ TikTok: dados do usuário não encontrados');
          return null;
        }

        // Calcular engajamento dos vídeos
        const videos = videoList.slice(0, 12).map((video: any) => {
          const stats = video.stats || {};
          return {
            id: video.id,
            description: video.desc || '',
            video_url: `https://www.tiktok.com/@${username}/video/${video.id}`,
            created_at: new Date(video.createTime * 1000).toISOString(),
            likes: stats.diggCount || 0,
            comments: stats.commentCount || 0,
            shares: stats.shareCount || 0,
            views: stats.playCount || 0,
            engagement: (stats.diggCount || 0) + (stats.commentCount || 0) + (stats.shareCount || 0)
          };
        });

        const followers = userData.stats?.followerCount || 0;
        const totalEngagement = videos.reduce((sum: number, v: any) => sum + v.engagement, 0);
        const avgEngagementRate = followers > 0 ? ((totalEngagement / videos.length) / followers * 100).toFixed(2) : '0';

        console.log(`✅ TikTok scraped: ${videos.length} vídeos, ${followers} seguidores, ${avgEngagementRate}% engajamento`);

        return {
          account: {
            username: userData.uniqueId,
            nickname: userData.nickname,
            followers_count: followers,
            following_count: userData.stats?.followingCount || 0,
            videos_count: userData.stats?.videoCount || 0,
            likes_count: userData.stats?.heartCount || 0,
            biography: userData.signature || '',
            avatar_url: userData.avatarLarger,
            avg_engagement_rate: avgEngagementRate
          },
          videos: videos
        };
      } catch (parseError) {
        console.error('❌ Erro ao parsear dados do TikTok:', parseError);
        return null;
      }
    }

    console.log('⚠️ TikTok scraping: estrutura HTML não reconhecida (possível bloqueio)');
    return null;
  } catch (error) {
    console.error('❌ Erro ao fazer scraping do TikTok:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { scheduled = false, include_trends = false, include_paa = false, is_automated = false, test_mode = false, test_api = '' } = body;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY') || '';
    const xBearerToken = Deno.env.get('X_BEARER_TOKEN') || '';
    const metaUserToken = Deno.env.get('META_USER_TOKEN') || '';
    const googleSearchApiKey = Deno.env.get('GOOGLE_API_KEY') || '';
    const googleCxId = Deno.env.get('GOOGLE_CX_ID') || '';
    const googleYoutubeApiKey = Deno.env.get('GOOGLE_YOUTUBE_API_KEY') || '';

    // DIAGNOSTIC MODE - Check environment variables
    if (test_mode && test_api === 'diagnostics') {
      return new Response(
        JSON.stringify({
          status: 'diagnostics',
          env_vars: {
            GOOGLE_AI_API_KEY: googleApiKey ? `${googleApiKey.substring(0, 10)}...` : 'NOT SET',
            GOOGLE_API_KEY: googleSearchApiKey ? `${googleSearchApiKey.substring(0, 10)}...` : 'NOT SET',
            GOOGLE_CX_ID: googleCxId || 'NOT SET',
          },
          message: 'Variáveis de ambiente verificadas'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TEST MODE - Quick API health check
    if (test_mode && test_api) {
      console.log(`🧪 Test mode: checking ${test_api}`);
      
      if (test_api === 'google_ai') {
        try {
          const testPrompt = 'Responda apenas "OK" se você está funcionando.';
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: testPrompt }] }]
              })
            }
          );
          
          if (!response.ok) {
            throw new Error(`Google AI API retornou status ${response.status}`);
          }
          
          const result = await response.json();
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          return new Response(
            JSON.stringify({
              status: 'success',
              api: 'Google AI (Gemini)',
              response: text,
              message: 'API Google AI está funcionando corretamente'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              status: 'error',
              api: 'Google AI (Gemini)',
              error: error instanceof Error ? error.message : 'Erro desconhecido',
              message: 'Google AI indisponível no momento'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      if (test_api === 'google_search') {
        try {
          const testQuery = 'turismo brasil';
          const response = await fetch(
            `https://www.googleapis.com/customsearch/v1?key=${googleSearchApiKey}&cx=${googleCxId}&q=${encodeURIComponent(testQuery)}&num=1`
          );
          
          if (!response.ok) {
            throw new Error(`Google Search API retornou status ${response.status}`);
          }
          
          const result = await response.json();
          
          return new Response(
            JSON.stringify({
              status: 'success',
              api: 'Google Search API',
              results: result.items?.length || 0,
              message: 'API de busca do Google está funcionando corretamente'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              status: 'warning',
              api: 'Google Search API',
              error: error instanceof Error ? error.message : 'Erro desconhecido',
              message: 'Falha ao conectar com Google Search API (modo diagnóstico)'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Track API health status
    const apiHealthStatus = {
      x_api: { healthy: true, error: null as string | null },
      instagram_api: { healthy: true, error: null as string | null },
      google_search: { healthy: true, error: null as string | null }
    };

    console.log('Request flags:', { scheduled, include_trends, include_paa });
    // Manual (rápido) vs Agendado (completo)
    if (!scheduled) {
      console.log('Starting QUICK manual analysis');
      // Get only the first active competitor for quick run
      const { data: competitors, error: competitorsError } = await supabase
        .from('competitors')
        .select('*')
        .eq('is_active', true)
        .limit(1);

      if (competitorsError) throw competitorsError;

      const competitor = competitors?.[0];

      if (competitor) {
        // 1) Análise de Preços e Produtos - ESTRUTURADA
        const pricingPrompt = `Analise os pacotes, preços e produtos da ${competitor.name} (${competitor.website_url}).

RETORNE UM JSON NO FORMATO EXATO:
{
  "products": [
    {
      "name": "Nome do Pacote - Destino",
      "price": 2499.00,
      "currency": "BRL",
      "region": "Nacional",
      "description": "Breve descrição",
      "url": "https://..."
    }
  ],
  "pricing_strategy": {
    "positioning": "premium",
    "price_range": "R$ 1500 - R$ 5000",
    "payment_methods": ["Pix", "Cartão 12x"],
    "active_promotions": ["Desconto 10% à vista"]
  },
  "top_destinations": ["Gramado", "Porto de Galinhas"]
}

Seja específico e use dados reais.`;

        console.log('🔍 Starting pricing analysis...');
        const pricingAnalysis = await retryWithBackoff(() => 
          analyzeWithGemini(googleApiKey, pricingPrompt, true)
        );
        console.log('✅ Pricing analysis completed');
        
        let pricingStructuredData = {};
        try {
          pricingStructuredData = JSON.parse(pricingAnalysis.data);
        } catch {
          pricingStructuredData = { products: [], pricing_strategy: {}, raw_response: pricingAnalysis.data };
        }
        
        await supabase.from('market_analysis').insert({
          competitor_id: competitor.id,
          analysis_type: 'pricing',
          data: pricingStructuredData,
          insights: pricingAnalysis.insights,
          recommendations: pricingAnalysis.recommendations,
          confidence_score: 0.85,
          is_automated
        });
        console.log('Quick pricing analysis inserted');

        // 2) Análise de Redes Sociais - FOCO EM ENGAJAMENTO E PÚBLICO
        const socialUrls = [
          competitor.instagram_url,
          competitor.youtube_url,
          competitor.tiktok_url,
          competitor.x_url
        ].filter(Boolean).join(', ');

        if (socialUrls) {
          // Fetch real X data with health check
          let xData = null;
          if (competitor.x_url && xBearerToken) {
            const xUsername = competitor.x_url.split('/').pop();
            if (xUsername) {
              try {
                xData = await fetchXUserData(xUsername, xBearerToken);
                apiHealthStatus.x_api.healthy = true;
              } catch (error) {
                console.error('X API failed:', error);
                apiHealthStatus.x_api.healthy = false;
                apiHealthStatus.x_api.error = error instanceof Error ? error.message : 'Falha ao buscar dados do X/Twitter';
                
                await supabase.from('api_tokens').upsert({
                  api_name: 'X_BEARER_TOKEN',
                  is_healthy: false,
                  last_error: apiHealthStatus.x_api.error,
                  last_health_check: new Date().toISOString()
                });
              }
            }
          }

          // Fetch real Instagram data via scraping (sem API)
          let instagramData = null;
          if (competitor.instagram_url) {
            try {
              instagramData = await fetchInstagramData(competitor.instagram_url);
              apiHealthStatus.instagram_api.healthy = instagramData !== null;
              
              await supabase.from('api_tokens').upsert({
                api_name: 'INSTAGRAM_SCRAPING',
                is_healthy: instagramData !== null,
                last_error: instagramData ? null : 'Scraping retornou dados vazios',
                last_health_check: new Date().toISOString()
              });
            } catch (error) {
              console.error('Instagram scraping failed:', error);
              apiHealthStatus.instagram_api.healthy = false;
              apiHealthStatus.instagram_api.error = error instanceof Error ? error.message : 'Falha ao fazer scraping do Instagram';
              
              await supabase.from('api_tokens').upsert({
                api_name: 'INSTAGRAM_SCRAPING',
                is_healthy: false,
                last_error: apiHealthStatus.instagram_api.error,
                last_health_check: new Date().toISOString()
              });
            }
          }

          // Fetch real YouTube data via API oficial Google
          let youtubeData = null;
          if (competitor.youtube_url && googleYoutubeApiKey) {
            try {
              youtubeData = await fetchYouTubeData(competitor.youtube_url, googleYoutubeApiKey);
              console.log(youtubeData ? `✅ YouTube API: ${youtubeData.videos.length} vídeos` : '⚠️ YouTube retornou null');
              
              await supabase.from('api_tokens').upsert({
                api_name: 'YOUTUBE_DATA_API',
                is_healthy: youtubeData !== null,
                last_error: youtubeData ? null : 'API retornou dados vazios',
                last_health_check: new Date().toISOString()
              });
            } catch (error) {
              console.error('YouTube API failed:', error);
              
              await supabase.from('api_tokens').upsert({
                api_name: 'YOUTUBE_DATA_API',
                is_healthy: false,
                last_error: error instanceof Error ? error.message : 'Falha ao buscar dados do YouTube',
                last_health_check: new Date().toISOString()
              });
            }
          }

          // Fetch real TikTok data via scraping (sem API)
          let tiktokData = null;
          if (competitor.tiktok_url) {
            try {
              tiktokData = await fetchTikTokData(competitor.tiktok_url);
              console.log(tiktokData ? `✅ TikTok scraped: @${tiktokData.account.username}` : '⚠️ TikTok scraping retornou null');
              
              await supabase.from('api_tokens').upsert({
                api_name: 'TIKTOK_SCRAPING',
                is_healthy: tiktokData !== null,
                last_error: tiktokData ? null : 'Scraping retornou dados vazios',
                last_health_check: new Date().toISOString()
              });
            } catch (error) {
              console.error('TikTok scraping failed:', error);
              
              await supabase.from('api_tokens').upsert({
                api_name: 'TIKTOK_SCRAPING',
                is_healthy: false,
                last_error: error instanceof Error ? error.message : 'Falha ao fazer scraping do TikTok',
                last_health_check: new Date().toISOString()
              });
            }
          }

          let socialPrompt = `Analise PROFUNDAMENTE as redes sociais da ${competitor.name}: ${socialUrls}

🎯 ANÁLISE DE ENGAJAMENTO (PRIORIDADE MÁXIMA):

📱 POSTS COM MAIOR ENGAJAMENTO (últimas 48h):
- Identifique os 5 posts/conteúdos com MAIS curtidas, comentários e compartilhamentos
- Para cada post top: tema, formato (reel/carrossel/foto), número aproximado de interações
- Quais PRODUTOS/DESTINOS estão sendo promovidos nos posts de maior engajamento?

👥 PÚBLICO-ALVO E INTERAÇÃO:
- Perfil demográfico predominante (idade, gênero baseado nos comentários/seguidores)
- Localização geográfica do público (cidades/regiões mencionadas)
- Tipos de comentários/perguntas mais frequentes
- Horários de maior interação

🎨 ESTRATÉGIA DE CONTEÚDO:
- Tom de voz (formal/informal, descontraído/profissional)
- Tipos de conteúdo (educativo, promocional, entretenimento)
- Frequência de postagem
- Hashtags e palavras-chave usadas

💼 GERAÇÃO DE LEADS:
- Como capturam contatos? (link na bio, direct, WhatsApp, formulários)
- Calls-to-action utilizados
- Promoções/ofertas exclusivas para redes sociais
- Estratégias de remarketing visíveis`;

          // Add real X data to prompt if available
          if (xData && xData.tweets.length > 0) {
            const tweetsInfo = xData.tweets.slice(0, 5).map((tweet: any) => {
              const metrics = tweet.public_metrics;
              return `
Tweet: "${tweet.text.substring(0, 100)}..."
📊 Métricas: ${metrics.like_count} likes, ${metrics.retweet_count} RTs, ${metrics.reply_count} respostas
📅 Data: ${new Date(tweet.created_at).toLocaleDateString('pt-BR')}`;
            }).join('\n');

            socialPrompt += `\n\n🐦 DADOS REAIS DO X (TWITTER):
${tweetsInfo}

Use estes dados concretos do X para enriquecer sua análise de engajamento.`;
          }

          // Add real Instagram data to prompt if available
          if (instagramData && instagramData.media.length > 0) {
            const postsInfo = instagramData.media.slice(0, 5).map((post: any) => {
              return `
Post: "${post.caption?.substring(0, 100) || 'Sem legenda'}..."
📊 Métricas: ${post.like_count || 0} likes, ${post.comments_count || 0} comentários
📅 Data: ${new Date(post.timestamp).toLocaleDateString('pt-BR')}
🔗 Link: ${post.permalink}`;
            }).join('\n');

            const accountInfo = `
👤 Perfil: @${instagramData.account.username}
👥 Seguidores: ${instagramData.account.followers_count || 'N/A'}
📸 Posts totais: ${instagramData.account.media_count || 'N/A'}`;

            socialPrompt += `\n\n📸 DADOS REAIS DO INSTAGRAM:
${accountInfo}

${postsInfo}

Use estes dados concretos do Instagram para enriquecer sua análise de engajamento e público-alvo.`;
          }

          // Add real YouTube data to prompt if available
          if (youtubeData && youtubeData.videos.length > 0) {
            const videosInfo = youtubeData.videos.slice(0, 5).map((video: any) => {
              return `
Vídeo: "${video.title}"
📊 Métricas: ${video.views.toLocaleString()} views, ${video.likes.toLocaleString()} likes, ${video.comments.toLocaleString()} comentários
💬 Engajamento: ${video.engagement.toLocaleString()} interações
⏱️ Duração: ${video.duration}
📅 Publicado: ${new Date(video.published_at).toLocaleDateString('pt-BR')}
🔗 Link: ${video.video_url}`;
            }).join('\n');

            const channelInfo = `
📺 Canal: ${youtubeData.channel.title}
👥 Inscritos: ${youtubeData.channel.subscribers_count.toLocaleString()}
🎬 Total de vídeos: ${youtubeData.channel.video_count.toLocaleString()}
👁️ Views totais: ${youtubeData.channel.total_views.toLocaleString()}
📈 Taxa de engajamento: ${youtubeData.channel.avg_engagement_rate}%`;

            socialPrompt += `\n\n📺 DADOS REAIS DO YOUTUBE:
${channelInfo}

Vídeos recentes:
${videosInfo}

Use estes dados concretos do YouTube para identificar temas de vídeos que performam melhor, estratégias de thumbnail e títulos que geram mais cliques.`;
          }

          // Add real TikTok data to prompt if available
          if (tiktokData && tiktokData.videos.length > 0) {
            const videosInfo = tiktokData.videos.slice(0, 5).map((video: any) => {
              return `
Vídeo: "${video.description?.substring(0, 100) || 'Sem descrição'}..."
📊 Métricas: ${video.likes} likes, ${video.comments} comentários, ${video.shares} shares, ${video.views} views
💬 Engajamento total: ${video.engagement} interações
📅 Data: ${new Date(video.created_at).toLocaleDateString('pt-BR')}
🔗 Link: ${video.video_url}`;
            }).join('\n');

            const accountInfo = `
👤 Perfil: @${tiktokData.account.username} (${tiktokData.account.nickname})
👥 Seguidores: ${tiktokData.account.followers_count.toLocaleString()}
🎬 Vídeos totais: ${tiktokData.account.videos_count}
❤️ Likes totais: ${tiktokData.account.likes_count.toLocaleString()}
📈 Taxa de engajamento: ${tiktokData.account.avg_engagement_rate}%`;

            socialPrompt += `\n\n🎵 DADOS REAIS DO TIKTOK:
${accountInfo}

Vídeos recentes:
${videosInfo}

Use estes dados concretos do TikTok para identificar tendências de vídeo curto, formatos virais e estratégias de conteúdo que performam melhor.`;
          }

          socialPrompt += `\n\nSeja CONCRETO, use DADOS REAIS observados nas redes sociais.`;

          console.log('🔍 Starting social media analysis...');
          const socialAnalysis = await retryWithBackoff(() => 
            analyzeWithGemini(googleApiKey, socialPrompt)
          );
          console.log('✅ Social media analysis completed');
          
          const analysisData: any = { raw_response: socialAnalysis.data };
          if (xData) {
            analysisData.x_metrics = {
              username: xData.user?.username,
              tweets_analyzed: xData.tweets.length,
              sample_tweets: xData.tweets.slice(0, 3).map((t: any) => ({
                id: t.id,
                text: t.text.substring(0, 100),
                metrics: t.public_metrics
              }))
            };
          }
          if (instagramData) {
            analysisData.instagram_metrics = {
              followers: instagramData.account.followers_count,
              posts_analyzed: instagramData.media.length,
              sample_posts: instagramData.media.slice(0, 3).map((p: any) => ({
                caption: p.caption?.substring(0, 100),
                likes: p.like_count,
                comments: p.comments_count,
                type: p.media_type,
                permalink: p.permalink
              }))
            };
          }
          
          await supabase.from('market_analysis').insert({
            competitor_id: competitor.id,
            analysis_type: 'social_media',
            data: analysisData,
            insights: socialAnalysis.insights,
            recommendations: socialAnalysis.recommendations,
            confidence_score: (xData || instagramData) ? 0.95 : 0.85,
            is_automated
          });
          console.log('Quick social media analysis inserted');
        }

        // 3) Resumo Estratégico Integrado - ESTRUTURADO
        const strategyPrompt = `Crie resumo estratégico sobre ${competitor.name}.

RETORNE UM JSON NO FORMATO EXATO:
{
  "summary": {
    "demand_index": 85,
    "demand_change_pct": 4.0,
    "price_variation_pct": -4.8,
    "avg_engagement_pct": 3.3,
    "sentiment": "positive"
  },
  "insights_of_day": [
    "Clientes valorizam transparência de preços",
    "Interesse crescente em turismo sustentável"
  ],
  "recommended_actions": [
    "Rever comunicação de taxas no site",
    "Criar landing page de ecoturismo"
  ],
  "smart_alerts": [
    {
      "title": "Aumento em buscas 'pacotes baratos'",
      "description": "Consumidor mais sensível a preço",
      "severity": "medium",
      "category": "pricing"
    }
  ],
  "opportunities": ["Pacotes temáticos de ecoturismo"],
  "risks": ["Concorrentes reforçando transparência"]
}

Seja específico e acionável.`;
        
        console.log('🔍 Starting strategic summary...');
        const strategyAnalysis = await retryWithBackoff(() => 
          analyzeWithGemini(googleApiKey, strategyPrompt, true)
        );
        console.log('✅ Strategic summary completed');
        
        let structuredData = {};
        try {
          structuredData = JSON.parse(strategyAnalysis.data);
        } catch {
          structuredData = { summary: {}, insights_of_day: [], raw_response: strategyAnalysis.data };
        }
        
        await supabase.from('market_analysis').insert({
          competitor_id: competitor.id,
          analysis_type: 'strategic_insights',
          data: structuredData,
          insights: strategyAnalysis.insights,
          recommendations: strategyAnalysis.recommendations,
          confidence_score: 0.90,
          is_automated
        });
        console.log('Quick strategic summary inserted');
      }

      // 2) Quick Google Trends (optional) - DADOS REAIS
      if (include_trends) {
        console.log('🔍 Buscando dados REAIS do Google Trends...');
        
        // Buscar dados REAIS do Google Trends
        const realTrendsData = await fetchRealGoogleTrends([
          'turismo Brasil',
          'viagem Brasil', 
          'pacotes turismo',
          'viagens baratas',
          'destinos Brasil'
        ]);
        
        if (realTrendsData && (realTrendsData.keywords.length > 0 || realTrendsData.destinations.length > 0)) {
          // Estruturar dados reais
          const trendsStructuredData = {
            timestamp: realTrendsData.timestamp,
            data_source: 'Google Trends API (Real Data)',
            period: {
              from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              to: new Date().toISOString(),
              description: 'Últimos 7 dias'
            },
            top_keywords: realTrendsData.keywords.map((k: any) => ({
              keyword: k.keyword,
              avg_interest: k.avg_interest,
              max_interest: k.max_interest,
              trend: k.trend
            })),
            hot_destinations: realTrendsData.destinations.map((d: any) => ({
              name: d.name,
              interest_score: d.interest_score,
              estimated_searches: d.relative_searches,
              source: 'Google Trends'
            })),
            metadata: {
              total_keywords_analyzed: realTrendsData.keywords.length,
              total_destinations_analyzed: realTrendsData.destinations.length,
              collection_date: new Date().toISOString()
            }
          };
          
          // Gerar insights baseados nos dados REAIS
          const topDestination = realTrendsData.destinations[0];
          const trendingKeywords = realTrendsData.keywords.filter((k: any) => k.trend === 'up');
          
          const insights = `Dados reais do Google Trends (últimos 7 dias):
          
📊 DESTINO MAIS BUSCADO: ${topDestination?.name || 'N/A'} (interesse: ${topDestination?.interest_score || 0}/100)

🔥 KEYWORDS EM ALTA: ${trendingKeywords.map((k: any) => k.keyword).join(', ') || 'Análise em andamento'}

📈 TOTAL DE DESTINOS ANALISADOS: ${realTrendsData.destinations.length}

⚠️ NOTA: Dados extraídos diretamente do Google Trends público. Valores de interesse são relativos (0-100).`;

          const recommendations = realTrendsData.destinations.slice(0, 3).map((d: any, i: number) => 
            `${i + 1}. Focar em ${d.name} - interesse atual de ${d.interest_score}/100`
          ).join('\n');
          
          await supabase.from('market_analysis').insert({
            analysis_type: 'google_trends',
            data: trendsStructuredData,
            insights: insights,
            recommendations: recommendations,
            confidence_score: 0.95, // Alta confiança - dados reais
            is_automated
          });
          
          console.log('✅ Dados REAIS do Google Trends salvos');
        } else {
          console.log('❌ Falha ao obter dados reais do Google Trends - análise não será salva');
          console.log('⚠️ Somente dados reais são permitidos. Configure corretamente a coleta.');
          // NÃO salvar dados simulados - apenas dados REAIS são aceitos
        }
        console.log('Quick Google Trends inserted');
      }

      // 3) Quick People Also Ask - DESABILITADO (requer scraping real)
      if (include_paa) {
        console.log('⚠️ Quick PAA desabilitado - aguardando implementação de scraping real');
        // NÃO usar IA para inventar perguntas
      }

      // Quick Trends Summary - DESABILITADO (requer dados reais)
      if (include_trends && include_paa) {
        console.log('⚠️ Quick Trends Summary desabilitado - requer dados reais');
        // NÃO criar resumo com dados simulados
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          mode: 'quick', 
          message: 'Análise rápida concluída', 
          timestamp: new Date().toISOString(),
          api_health: apiHealthStatus
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Scheduled: full analysis for all competitors + trends + PAA
    console.log('Starting FULL scheduled analysis');

    // Get all active competitors
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitors')
      .select('*')
      .eq('is_active', true);

    if (competitorsError) throw competitorsError;

    console.log(`Analyzing ${competitors?.length || 0} competitors`);

    for (const competitor of competitors || []) {
      console.log(`Analyzing competitor: ${competitor.name}`);

      // 1. Analyze Pricing Strategy - ANÁLISE COMPLETA E DIRETA
      const pricingPrompt = `Analise DIRETAMENTE os pacotes, preços e estratégias comerciais da ${competitor.name} (${competitor.website_url}) e suas redes sociais.

🎯 ANÁLISE COMPLETA E IMEDIATA:

📦 PRINCIPAIS PACOTES/PRODUTOS (5-7 exemplos concretos):
- Nome do pacote/produto
- Preço (quando disponível)
- Destino e características
- Diferenciais destacados

💰 ESTRATÉGIA DE PRECIFICAÇÃO:
- Faixa de preços praticada (entrada, média, premium)
- Condições de pagamento mais promovidas
- Promoções e ofertas ativas
- Cupons ou cashback disponíveis

📊 ANÁLISE ESTRATÉGICA:
- Posicionamento no mercado (econômico/médio/premium)
- Destinos mais promovidos
- Sazonalidade identificada
- Pacotes com MAIOR DESTAQUE nas redes sociais (curtidas, comentários)

Seja DIRETO, use DADOS CONCRETOS observados no site e redes sociais.`;

      console.log('Starting pricing analysis...');
      try {
        const pricingAnalysis = await retryWithBackoff(() => 
          analyzeWithGemini(googleApiKey, pricingPrompt)
        );
        const { error: pricingError } = await supabase.from('market_analysis').insert({
          competitor_id: competitor.id,
          analysis_type: 'pricing',
          data: { raw_response: pricingAnalysis.data },
          insights: pricingAnalysis.insights,
          recommendations: pricingAnalysis.recommendations,
          confidence_score: 0.85,
          is_automated
        });
        if (pricingError) console.error('Error inserting pricing analysis:', pricingError);
        console.log('✅ Pricing analysis completed');
      } catch (err) {
        console.error('❌ Pricing analysis failed:', err instanceof Error ? err.message : String(err));
      }

      // 2. Analyze Social Media Trends
      const socialUrls = [
        competitor.instagram_url,
        competitor.youtube_url,
        competitor.tiktok_url,
        competitor.x_url
      ].filter(Boolean).join(', ');

      if (socialUrls) {
        // Fetch real X data with health check
        let xData = null;
        if (competitor.x_url && xBearerToken) {
          const xUsername = competitor.x_url.split('/').pop();
          if (xUsername) {
            try {
              xData = await fetchXUserData(xUsername, xBearerToken);
              apiHealthStatus.x_api.healthy = true;
            } catch (error) {
              console.error(`X API failed for ${competitor.name}:`, error);
              apiHealthStatus.x_api.healthy = false;
              apiHealthStatus.x_api.error = error instanceof Error ? error.message : 'Falha ao buscar dados do X/Twitter';
              
              await supabase.from('api_tokens').upsert({
                api_name: 'X_BEARER_TOKEN',
                is_healthy: false,
                last_error: apiHealthStatus.x_api.error,
                last_health_check: new Date().toISOString()
              });
            }
          }
        }

        // Fetch real Instagram data via scraping (sem API)
        let instagramData = null;
        if (competitor.instagram_url) {
          try {
            instagramData = await fetchInstagramData(competitor.instagram_url);
            apiHealthStatus.instagram_api.healthy = instagramData !== null;
            
            await supabase.from('api_tokens').upsert({
              api_name: 'INSTAGRAM_SCRAPING',
              is_healthy: instagramData !== null,
              last_error: instagramData ? null : 'Scraping retornou dados vazios',
              last_health_check: new Date().toISOString()
            });
          } catch (error) {
            console.error(`Instagram API failed for ${competitor.name}:`, error);
            apiHealthStatus.instagram_api.healthy = false;
            apiHealthStatus.instagram_api.error = error instanceof Error ? error.message : 'Falha ao buscar dados do Instagram';
            
            await supabase.from('api_tokens').upsert({
              api_name: 'INSTAGRAM_SCRAPING',
              is_healthy: false,
              last_error: apiHealthStatus.instagram_api.error,
              last_health_check: new Date().toISOString()
            });
          }
        }

        // Fetch real TikTok data via scraping (sem API)
        let tiktokData = null;
        if (competitor.tiktok_url) {
          try {
            tiktokData = await fetchTikTokData(competitor.tiktok_url);
            console.log(tiktokData ? `✅ TikTok scraped: @${tiktokData.account.username}` : '⚠️ TikTok scraping retornou null');
            
            await supabase.from('api_tokens').upsert({
              api_name: 'TIKTOK_SCRAPING',
              is_healthy: tiktokData !== null,
              last_error: tiktokData ? null : 'Scraping retornou dados vazios',
              last_health_check: new Date().toISOString()
            });
          } catch (error) {
            console.error(`TikTok scraping failed for ${competitor.name}:`, error);
            
            await supabase.from('api_tokens').upsert({
              api_name: 'TIKTOK_SCRAPING',
              is_healthy: false,
              last_error: error instanceof Error ? error.message : 'Falha ao fazer scraping do TikTok',
              last_health_check: new Date().toISOString()
            });
          }
        }

        let socialPrompt = `Analise PROFUNDAMENTE as redes sociais da ${competitor.name}: ${socialUrls}

🎯 ANÁLISE DE ENGAJAMENTO E PÚBLICO (PRIORIDADE MÁXIMA):

📱 POSTS COM MAIOR ENGAJAMENTO (últimas 72h):
- Identifique os 7-10 posts/conteúdos com MAIS curtidas, comentários e compartilhamentos
- Para cada post top: tema, formato (reel/carrossel/foto/vídeo), métricas de engajamento
- Quais PRODUTOS/DESTINOS/PACOTES estão sendo promovidos nos posts de maior engajamento?
- Qual tipo de conteúdo gera mais salvamentos?

👥 PÚBLICO-ALVO E DEMOGRAFIA:
- Perfil demográfico predominante (faixa etária, gênero - baseado em comentários/seguidores)
- Localização geográfica do público (estados, cidades mencionadas)
- Poder aquisitivo percebido (baseado nos produtos/pacotes com mais interação)
- Personas identificadas (viajantes solo, famílias, casais, grupos)

💬 INTERAÇÃO E ENGAJAMENTO:
- Tipos de comentários mais frequentes (dúvidas, elogios, solicitações)
- Perguntas recorrentes do público
- Horários de maior interação
- Taxa de resposta da empresa

💼 ESTRATÉGIAS DE GERAÇÃO DE LEADS:
- Como capturam contatos? (link na bio, direct, WhatsApp, formulários, Manychat)
- Calls-to-action mais utilizados
- Promoções exclusivas para followers
- Estratégias de urgência/escassez
- Uso de landing pages

🎨 ESTRATÉGIA DE CONTEÚDO:
- Tom de voz e personalidade da marca
- Frequência e horários de postagem
- Formatos que mais performam
- Hashtags estratégicas
- Parcerias com influenciadores`;

        // Add real X data to prompt if available
        if (xData && xData.tweets.length > 0) {
          const tweetsInfo = xData.tweets.slice(0, 10).map((tweet: any) => {
            const metrics = tweet.public_metrics;
            const engagement = metrics.like_count + metrics.retweet_count + metrics.reply_count;
            return `
Tweet: "${tweet.text.substring(0, 150)}..."
📊 Métricas: ${metrics.like_count} likes, ${metrics.retweet_count} RTs, ${metrics.reply_count} respostas, ${engagement} engajamento total
📅 Data: ${new Date(tweet.created_at).toLocaleDateString('pt-BR')}`;
          }).join('\n');

          const totalEngagement = xData.tweets.reduce((acc: number, tweet: any) => {
            const m = tweet.public_metrics;
            return acc + m.like_count + m.retweet_count + m.reply_count;
          }, 0);
          
          const avgEngagement = Math.round(totalEngagement / xData.tweets.length);

          socialPrompt += `\n\n🐦 DADOS REAIS DO X (TWITTER):
📈 Total de tweets analisados: ${xData.tweets.length}
📊 Engajamento médio por tweet: ${avgEngagement} interações

Posts recentes:
${tweetsInfo}

Use estes dados concretos do X para enriquecer sua análise de engajamento e identificar padrões de conteúdo que performam bem.`;
        }

        // Add real Instagram data to prompt if available
        if (instagramData && instagramData.media.length > 0) {
          const postsInfo = instagramData.media.slice(0, 10).map((post: any) => {
            const engagement = (post.like_count || 0) + (post.comments_count || 0);
            return `
Post: "${post.caption?.substring(0, 150) || 'Sem legenda'}..."
📊 Métricas: ${post.like_count || 0} likes, ${post.comments_count || 0} comentários, ${engagement} engajamento total
🎬 Tipo: ${post.media_type}
📅 Data: ${new Date(post.timestamp).toLocaleDateString('pt-BR')}
🔗 Link: ${post.permalink}`;
          }).join('\n');

          const totalEngagement = instagramData.media.reduce((acc: number, post: any) => {
            return acc + (post.like_count || 0) + (post.comments_count || 0);
          }, 0);
          
          const avgEngagement = Math.round(totalEngagement / instagramData.media.length);

          const accountInfo = `
👤 Perfil: @${instagramData.account.username}
👥 Seguidores: ${instagramData.account.followers_count || 'N/A'}
📸 Posts totais: ${instagramData.account.media_count || 'N/A'}`;

          socialPrompt += `\n\n📸 DADOS REAIS DO INSTAGRAM:
${accountInfo}

📈 Total de posts analisados: ${instagramData.media.length}
📊 Engajamento médio por post: ${avgEngagement} interações

Posts recentes:
${postsInfo}

Use estes dados concretos do Instagram para enriquecer sua análise de engajamento, identificar formatos que performam melhor e entender o público-alvo.`;
        }

        // Add real TikTok data to prompt if available
        if (tiktokData && tiktokData.videos.length > 0) {
          const videosInfo = tiktokData.videos.slice(0, 10).map((video: any) => {
            return `
Vídeo: "${video.description?.substring(0, 150) || 'Sem descrição'}..."
📊 Métricas: ${video.likes} likes, ${video.comments} comentários, ${video.shares} shares, ${video.views} views
💬 Engajamento total: ${video.engagement} interações
📅 Data: ${new Date(video.created_at).toLocaleDateString('pt-BR')}
🔗 Link: ${video.video_url}`;
          }).join('\n');

          const totalEngagement = tiktokData.videos.reduce((acc: number, v: any) => acc + v.engagement, 0);
          const avgEngagement = Math.round(totalEngagement / tiktokData.videos.length);

          const accountInfo = `
👤 Perfil: @${tiktokData.account.username} (${tiktokData.account.nickname})
👥 Seguidores: ${tiktokData.account.followers_count.toLocaleString()}
🎬 Vídeos totais: ${tiktokData.account.videos_count}
❤️ Likes totais: ${tiktokData.account.likes_count.toLocaleString()}
📈 Taxa de engajamento: ${tiktokData.account.avg_engagement_rate}%`;

          socialPrompt += `\n\n🎵 DADOS REAIS DO TIKTOK:
${accountInfo}

📈 Total de vídeos analisados: ${tiktokData.videos.length}
📊 Engajamento médio por vídeo: ${avgEngagement} interações

Vídeos recentes:
${videosInfo}

Use estes dados concretos do TikTok para identificar tendências de vídeo, formatos virais e estratégias de conteúdo curto que performam melhor.`;
        }

        socialPrompt += `\n\nSeja EXTREMAMENTE CONCRETO, use DADOS REAIS e EXEMPLOS ESPECÍFICOS observados nas redes sociais.`;

        try {
          const socialAnalysis = await retryWithBackoff(() => 
            analyzeWithGemini(googleApiKey, socialPrompt)
          );
          
          const analysisData: any = { raw_response: socialAnalysis.data };
          if (xData) {
            analysisData.x_metrics = {
              tweets_analyzed: xData.tweets.length,
              total_engagement: xData.tweets.reduce((acc: number, t: any) => {
                const m = t.public_metrics;
                return acc + m.like_count + m.retweet_count + m.reply_count;
              }, 0),
              sample_tweets: xData.tweets.slice(0, 5).map((t: any) => ({
                text: t.text.substring(0, 150),
                metrics: t.public_metrics,
                created_at: t.created_at
              }))
            };
          }
          if (instagramData) {
            analysisData.instagram_metrics = {
              account: {
                username: instagramData.account.username,
                followers: instagramData.account.followers_count,
                total_posts: instagramData.account.media_count
              },
              posts_analyzed: instagramData.media.length,
              total_engagement: instagramData.media.reduce((acc: number, p: any) => {
                return acc + (p.like_count || 0) + (p.comments_count || 0);
              }, 0),
              sample_posts: instagramData.media.slice(0, 5).map((p: any) => ({
                caption: p.caption?.substring(0, 150),
                likes: p.like_count,
                comments: p.comments_count,
                type: p.media_type,
                timestamp: p.timestamp,
                permalink: p.permalink
              }))
            };
          }
          
          const { error: socialError } = await supabase.from('market_analysis').insert({
            competitor_id: competitor.id,
            analysis_type: 'social_media',
            data: analysisData,
            insights: socialAnalysis.insights,
            recommendations: socialAnalysis.recommendations,
            confidence_score: (xData || instagramData) ? 0.95 : 0.80,
            is_automated
          });
          if (socialError) console.error('Error inserting social analysis:', socialError);
        } catch (e) {
          console.error('Social analysis failed:', e);
        }
      }

      // 3. Market Trends Analysis (removed - will be replaced by trends summary)
      // Individual competitor trends analysis is now synthesized in the global summary

      // 4. Strategic Summary (combines all insights) - FOCO EM DADOS ACIONÁVEIS
      const strategyPrompt = `Você está criando um RESUMO ESTRATÉGICO EXECUTIVO COMPLETO sobre ${competitor.name} focado em GERAÇÃO DE CAMPANHAS.
      
      Este resumo deve sintetizar DADOS ACIONÁVEIS para criar campanhas de marketing efetivas:
      - Produtos/pacotes com maior engajamento nas redes sociais
      - Perfil demográfico e comportamental do público-alvo
      - Estratégias de geração de leads observadas
      - Conteúdos e formatos que geram resultados
      
      FORMATO OBRIGATÓRIO (use emojis, dados concretos e exemplos reais):
      
      📊 PRODUTOS & PREÇOS COM MAIOR ENGAJAMENTO (5-7 pontos):
      [produtos/pacotes específicos com mais interação, faixas de preço que geram mais conversão, destinos em alta, promoções que funcionam]
      
      📱 CONTEÚDOS DE ALTO ENGAJAMENTO (7-10 pontos):
      [posts específicos com métricas, formatos que performam (reel/carrossel), temas que geram salvamentos/compartilhamentos, horários ideais, CTAs efetivos]
      
      👥 PÚBLICO-ALVO E DEMOGRAFIA (5-7 pontos):
      [faixa etária predominante, gênero, localização geográfica, poder aquisitivo, perfis/personas identificadas, dores e desejos]
      
      💼 ESTRATÉGIAS DE GERAÇÃO DE LEADS (5-7 pontos):
      [métodos de captura (WhatsApp/formulário/Manychat), ofertas/iscas digitais, landing pages, estratégias de urgência, taxa de resposta]
      
      📈 TENDÊNCIAS E OPORTUNIDADES (5-7 pontos):
      [destinos emergentes, nichos inexplorados, comportamentos do consumidor, sazonalidade, lacunas no mercado]
      
      💡 PLANO DE AÇÃO PARA CAMPANHAS (5-7 recomendações):
      [ações concretas baseadas nos dados observados, tipos de campanha recomendados, públicos a segmentar, produtos a promover, formatos a usar]
      
      CRÍTICO: Use EXEMPLOS ESPECÍFICOS, NÚMEROS, DADOS CONCRETOS observados. Foque no que GERA RESULTADOS.`;

      try {
        const strategyAnalysis = await retryWithBackoff(() => 
          analyzeWithGemini(googleApiKey, strategyPrompt)
        );
        const { error: strategyError } = await supabase.from('market_analysis').insert({
          competitor_id: competitor.id,
          analysis_type: 'strategic_insights',
          data: { raw_response: strategyAnalysis.data },
          insights: strategyAnalysis.insights,
          recommendations: strategyAnalysis.recommendations,
          confidence_score: 0.90,
          is_automated
        });
        if (strategyError) console.error('Error inserting strategic analysis:', strategyError);
      } catch (e) {
        console.error('Strategic analysis failed:', e);
      }

      console.log(`Completed analysis for ${competitor.name}`);
    }

    // Global Google Trends (30 dias + 24 horas) - SOMENTE DADOS REAIS
    if (include_trends) {
      console.log('🔍 Coletando dados REAIS do Google Trends...');
      try {
        // Usar SOMENTE fetchRealGoogleTrends - sem simulação
        const realTrendsData = await fetchRealGoogleTrends([
          'turismo Brasil', 'viagem Brasil', 'pacotes turismo', 
          'viagens baratas', 'destinos Brasil', 'hotel Brasil',
          'passagem aérea', 'roteiro viagem'
        ]);
        
        if (realTrendsData && realTrendsData.keywords.length > 0) {
          const topKeyword = realTrendsData.keywords[0];
          const topDestination = realTrendsData.destinations[0];
          
          const insights = `Dados reais do Google Trends (últimos 7 dias):\n\n📊 DESTINO MAIS BUSCADO: ${topDestination?.name} (interesse: ${topDestination?.interest_score}/100)\n🔑 KEYWORD PRINCIPAL: ${topKeyword?.keyword} (interesse médio: ${topKeyword?.avg_interest}/100)\n\n${realTrendsData.destinations.map((d: any, i: number) => `${i+1}. ${d.name}: ${d.interest_score}/100`).join('\n')}`;
          
          await supabase.from('market_analysis').insert({
            analysis_type: 'google_trends',
            data: {
              timestamp: new Date().toISOString(),
              data_source: 'Google Trends API (Real Data)',
              period: { from: new Date(Date.now() - 7*24*60*60*1000).toISOString(), to: new Date().toISOString() },
              top_keywords: realTrendsData.keywords,
              hot_destinations: realTrendsData.destinations,
              trending_now: realTrendsData.trending_now
            },
            insights,
            recommendations: `Focar em ${topDestination?.name} e keywords relacionadas a ${topKeyword?.keyword}`,
            confidence_score: 0.95,
            is_automated
          });
          console.log('✅ Dados REAIS do Google Trends salvos');
        } else {
          console.log('❌ Falha ao coletar dados reais - análise não será salva');
        }
      } catch (e) {
        console.error('❌ Google Trends real data collection failed:', e);
      }
    }

    // Global PAA (once per run) - COMENTADO: requer scraping real do Google Search
    // TODO: Implementar scraping real das perguntas "People Also Ask" do Google
    if (include_paa) {
      console.log('⚠️ PAA analysis desabilitado - aguardando implementação de scraping real');
      // NÃO usar IA para "inventar" perguntas - apenas coletar dados reais
    }

    // Trends Summary - COMENTADO: aguarda dados reais do Google Trends + PAA
    // TODO: Implementar agregação de dados REAIS coletados (não simulação)
    if (include_trends && include_paa) {
      console.log('⚠️ Trends Summary desabilitado - requer dados reais coletados primeiro');
      // NÃO criar resumo com dados simulados - aguardar implementação completa
    }

    return new Response(
      JSON.stringify({ success: true, mode: 'full', message: 'Análise completa concluída', timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-competitors function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeWithGemini(apiKey: string, prompt: string, structuredOutput = false): Promise<any> {
  const systemPrompt = 'Você é um analista estratégico sênior de mercado de turismo. Forneça análises COMPLETAS, DIDÁTICAS e CONCISAS baseadas em dados reais da web. USE ESTES CABEÇALHOS OBRIGATÓRIOS: "Insights Principais:" seguido de 5-7 pontos detalhados e "Recomendações Estratégicas:" seguido de 5-7 ações específicas e práticas. Seja executivo, use dados concretos, e mantenha tom profissional mas acessível.';
  
  const fullPrompt = `${systemPrompt}\n\n${prompt}`;
  
  if (!apiKey) {
    console.error('❌ GOOGLE_AI_API_KEY não encontrada!');
    throw new Error('GOOGLE_AI_API_KEY não configurada');
  }
  
  console.log(`🔑 Usando Google AI com chave que começa com: ${apiKey.substring(0, 10)}...`);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Google AI Error ${response.status}:`, errText);
      if (response.status === 429) {
        throw new Error('Limite de requisições excedido na API do Google. Aguarde alguns minutos antes de tentar novamente.');
      }
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new Error(`Google AI indisponível (${response.status}).`);
      }
      throw new Error(`Google AI API error: ${response.status} - ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`✅ Google AI response received (${fullText.length} chars)`);
    if (data.usageMetadata) {
      console.log(`📊 Tokens: ${data.usageMetadata.promptTokenCount} prompt + ${data.usageMetadata.candidatesTokenCount} completion = ${data.usageMetadata.totalTokenCount} total`);
    }
  const insightMatch = fullText.match(/Insights?[:\s]+(.+?)(?=Recomendações?|$)/si);
  const recommendMatch = fullText.match(/Recomendações?[:\s]+(.+?)$/si);
  return {
    data: fullText,
    insights: insightMatch ? insightMatch[1].trim() : fullText, // REMOVIDO TRUNCAMENTO DE 500 CHARS
    recommendations: recommendMatch ? recommendMatch[1].trim() : fullText
  };
}
