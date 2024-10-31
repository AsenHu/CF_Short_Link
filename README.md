# CF_Short_Link

## API

请求必须包含

|请求头|值|
|:-|:-|
|Authorization|Bearer TheTokenHere|
|Content-Type|application/json（建议包含）|

响应

|名字|类型|描述|
|:-|:-|:-|
|ok|boolean|请求是否成功|
|error|string|请求失败时的错误信息|
|message|string|可能包含的详细信息|

---

### 创建短链接

POST /api/v1/create

**请求示例**

```json
{
    "url": "http://www.reallylong.link",
    "length": 6,
    "number": true,
    "capital": true,
    "lowercase": true,
    "expiration": 123456,
    "expirationTtl": 60
}
```

|名字|类型|描述|默认值|
|:-|:-|:-|:-|
|url|string|必填：需要缩短的长链接|无|
|length|number|可选：短链接的长度|6|
|number|boolean|可选：是否包含数字|true|
|capital|boolean|可选：是否包含大写字母|true|
|lowercase|boolean|可选：是否包含小写字母|true|
|expiration|number|可选：链接的过期时间戳|无|
|expirationTtl|number|可选：链接的存活时间（秒）|无|

当 `expiration` 和 `expirationTtl` 同时未指定时，`expirationTtl` 值为 2592000（30 天）

`expirationTtl` 不得小于 60

`url` 字段不得省略协议（http:// 或 https://）

---

**响应示例**

200 响应

```json
{
    "ok": true,
    "short": "b0.by/123Abc"
}
```

|名字|类型|描述|
|:-|:-:|:-|
|short|string|生成的短链接|

当 `lowercase` 为 `false` 并且 `capital` 为 `true` 时，返回的域名也会大写。（以便生成的 QR 码使用数字字母模式，而不是二进制模式）

403 响应

`Authorization` 请求头有误。

```json
{
    "ok": false,
    "error": "Forbidden"
}
```

400 响应

```json
{
    "ok": false,
    "error": "Bad Request",
    "message": "Invalid option field"
}
```

请求中包含无效的选项字段。

429 响应

```json
{
    "ok": false,
    "error": "Rate limit exceeded"
}
```

触发了速率限制，具体的响应可能由 cloudflare 提供。