interface Env {
    tokens: string;
    kv: KVNamespace;
    domain: string;
}

interface Link {
    short: {
        key: string;
        noHttps: string;
        full: string;
    };
    url?: string;
    expiration: number;
}

interface Data {
    cursor?: string;
    list_complete: boolean;
    links: Link[];
}

const onRequestGet = async (context: { request: Request, env: Env }) => {
    // 鉴权
    const token = context.request.headers.get('Authorization');
    const tokens: string[] = JSON.parse(context.env.tokens);
    console.log('得到 token', token);
    if (!token || !tokens.includes(token.replace('Bearer ', ''))) {
        console.log('鉴权失败');
        return genResponse({ ok: false, msg: "Forbidden" }, 403);
    }
    console.log('鉴权通过');

    // 从 URL 中获取查询参数的值
    const query = new URL(context.request.url).searchParams.get('q') || '';
    let cursor = new URL(context.request.url).searchParams.get('c') || '';
    console.log('Query:', query, 'Cursor:', cursor);

    // 获取数据
    let allKeys = []
    let entries;
    do {
        entries = await context.env.kv.list({ limit: 2, cursor: cursor || undefined });
        entries.list_complete = entries.list_complete
        if ('cursor' in entries) {
            cursor = entries.cursor
        }
        allKeys.push(...entries.keys)
    } while (!entries.list_complete)
    const result = {
        keys: allKeys,
        list_complete: entries.list_complete,
        cursor: undefined,
    }

    // 筛选 keys
    let keys = result.keys;
    if (query) {
        keys = keys.filter(key => key.metadata && String(key.metadata).includes(query));
    }

    // 生成返回数据
    const data: Data = {
        list_complete: result.list_complete,
        links: keys.map(key => {
            const url = key.metadata as string || '';
            return {
                short: {
                    key: key.name,
                    noHttps: context.env.domain + '/' + key.name,
                    full: 'https://' + context.env.domain + '/' + key.name
                },
                url: url.length === 1022 ? undefined : url,
                expiration: key.expiration || undefined
            };
        })
    };
    if ('cursor' in result) {
        data.cursor = result.cursor;
    }

    return genResponse({ ok: true, msg: "Success", data: data }, 200);
}

function genResponse(context: { ok: boolean, msg: string, data?: Data }, status: number) {
    return new Response(JSON.stringify(context), {
        status: status,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        }
    });
}

const onRequestOptions = async () => {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
        }
    });
}

export { onRequestGet, onRequestOptions };