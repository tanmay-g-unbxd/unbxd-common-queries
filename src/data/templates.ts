export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  defaultSql: string;
}

export const INITIAL_TEMPLATES: QueryTemplate[] = [
  {
    id: "visits-search-type",
    name: "Visits With/Without Site Search",
    description: "Analyze key metrics (hits, searches, orders, revenue, ST, CT) partitioned by day and segmented by whether the session contained site search events.",
    defaultSql: `SELECT
  dt,
  visit_type,
  CASE 
    WHEN session_type LIKE '%search%' AND session_type IS NOT NULL THEN 'Visits With Site Search'
    WHEN session_type NOT LIKE '%search%' OR session_type IS NULL THEN 'Visits Without Site Search'
    ELSE 'other'
  END AS type,

  SUM(hits) AS hits,
  SUM(Visit_events) AS Visit_events,
  COUNT(DISTINCT visit_id) AS visits,
  SUM(Searches) AS Searches,
  SUM(BROWSE) AS BROWSE,
  SUM(clicks) AS Clicks,
  SUM(Orders) AS Orders,
  SUM(sale_through) AS ST,
  SUM(click_through) AS CT,
  SUM(Units) AS Units,
  SUM(carts) AS Carts,
  SUM(Carts_quantity) AS Carts_quantity,
  SUM(revenue) AS Revenue,
  SUM(visitOrders) AS visitOrders,
  SUM(impressions) AS impressions,
  SUM(prodView) AS prodView

FROM (
  SELECT 
    DATE(_PARTITIONTIME) AS dt,
    JSON_EXTRACT(payload, '$.visit_id') AS visit_id,
    visit_type,

    STRING_AGG(DISTINCT session_type) AS session_type,

    COUNT(DISTINCT session_id) AS hits,

    SUM(CASE WHEN event_type = 'VISIT' THEN 1 ELSE 0 END) AS Visit_events,
    SUM(CASE WHEN event_type = 'SEARCH' THEN 1 ELSE 0 END) AS Searches,
    SUM(CASE WHEN event_type = 'BROWSE' THEN 1 ELSE 0 END) AS BROWSE,
    SUM(CASE WHEN event_type = 'CLICK' THEN 1 ELSE 0 END) AS clicks,
    SUM(CASE WHEN event_type = 'CART' THEN 1 ELSE 0 END) AS carts,
    SUM(CASE WHEN event_type = 'ORDER' THEN 1 ELSE 0 END) AS Orders,

    SUM(CASE WHEN sale_through = TRUE THEN 1 ELSE 0 END) AS sale_through,
    SUM(CASE WHEN click_through = TRUE THEN 1 ELSE 0 END) AS click_through,

    SUM(CASE WHEN event_type = 'ORDER' THEN revenue ELSE 0 END) AS revenue,
    SUM(CASE WHEN event_type = 'ORDER' THEN quantity ELSE 0 END) AS Units,
    SUM(CASE WHEN event_type = 'CART' THEN quantity ELSE 0 END) AS Carts_quantity,

    COUNT(DISTINCT CASE 
      WHEN event_type = 'ORDER'
        AND JSON_EXTRACT(payload, '$.visit_id') IS NOT NULL
        AND JSON_EXTRACT(payload, '$.visit_id') != 'unknown'
      THEN JSON_EXTRACT(payload, '$.visit_id')
    END) AS visitOrders,

    SUM(CASE WHEN event_type = 'PRODUCT_IMPRESSIONS' THEN 1 ELSE 0 END) AS impressions,
    SUM(CASE WHEN event_type = 'PRODUCT_PAGE_VIEW' THEN 1 ELSE 0 END) AS prodView

  FROM events.{api_key} -- Insert API key

  WHERE i_site_name = '{site_key}' -- Insert Site key
    AND ((source = TRUE) OR (source = FALSE AND enriched = TRUE)) 
    AND terminated = FALSE 
    AND _PARTITIONTIME >= TIMESTAMP('{start_date}')
    AND _PARTITIONTIME <= TIMESTAMP('{end_date}')

  GROUP BY dt, visit_type, visit_id
)

GROUP BY dt, visit_type, type`
  },
  {
    id: "device-session-user",
    name: "Device/Session/User Analysis",
    description: "Analyze sessions, visits, hits, clicks, add-to-carts, orders, ST, CT, and purchase quantities segmented by device type and session type.",
    defaultSql: `SELECT
  DATE(_PARTITIONTIME) AS date,
  visit_type,
  device.type,
  session_type,

  COUNT(DISTINCT JSON_EXTRACT(payload, '$.visit_id')) AS visits,
  COUNT(DISTINCT session_id) AS Hits,

  SUM(CASE WHEN event_type = 'CLICK' THEN 1 ELSE 0 END) AS clicks,
  SUM(CASE WHEN click_through = TRUE THEN 1 ELSE 0 END) AS CT,
  SUM(CASE WHEN event_type = 'CART' THEN 1 ELSE 0 END) AS carts,
  SUM(CASE WHEN event_type = 'ORDER' THEN 1 ELSE 0 END) AS orders,
  SUM(CASE WHEN sale_through = TRUE THEN 1 ELSE 0 END) AS ST,

  SUM(CASE WHEN event_type = 'ORDER' THEN quantity ELSE 0 END) AS units,
  SUM(CASE WHEN event_type = 'ORDER' THEN revenue ELSE 0 END) AS revenues

FROM events.{api_key}  -- Insert API key

WHERE
  i_site_name IN ('{site_key}')  -- Insert Site key
  -- AND session_type = 'search'
  AND terminated = FALSE
  AND _PARTITIONTIME >= TIMESTAMP('{start_date}')
  AND _PARTITIONTIME <= TIMESTAMP('{end_date}')
  AND ((source = TRUE) OR (source = FALSE AND enriched = TRUE))

GROUP BY
  1, 2, 3, 4`
  },
  {
    id: "autosuggest-analysis",
    name: "AutoSuggest Analysis",
    description: "Compare query execution metrics, search-conversion, clicks, click-through-rates, and revenues between autosuggest-triggered and normal search hits.",
    defaultSql: `SELECT  
  COALESCE(autoSuggestPayload.autosuggest_type, "Normal Search") AS autosuggest_type,
  COUNT(DISTINCT(session_id)) AS hits, 
  SUM(CASE WHEN event_type IN ('SEARCH') THEN 1 ELSE 0 END) AS searches, ---- use hits as searches instead of search event count.
  SUM(CASE WHEN event_type = "CLICK" THEN 1 ELSE 0 END) AS clicks,
  SUM(CASE WHEN click_through = TRUE THEN 1 ELSE 0 END) AS clickThroughs,
  SUM(CASE WHEN event_type = 'CART' THEN 1 ELSE 0 END) AS carts,
  SUM(CASE WHEN event_type = 'CART' THEN quantity ELSE 0 END) AS cart_quantity,
  SUM(CASE WHEN event_type = 'ORDER' THEN 1 ELSE 0 END) AS orders,
  SUM(CASE WHEN event_type = "ORDER" THEN quantity ELSE 0 END) AS order_quantity,
  SUM(CASE WHEN sale_through = TRUE THEN 1 ELSE 0 END) AS sale_throughs,
  SUM(CASE WHEN event_type = 'ORDER' THEN revenue ELSE 0 END) AS revenue,      
  SAFE_DIVIDE(SUM(CASE WHEN event_type = "CLICK" THEN 1 ELSE 0 END), COUNT(DISTINCT(session_id))) AS click_rate,
  SAFE_DIVIDE(SUM(CASE WHEN click_through = TRUE THEN 1 ELSE 0 END), COUNT(DISTINCT(session_id))) AS click_through_rate,
  SAFE_DIVIDE(SUM(CASE WHEN sale_through = TRUE THEN 1 ELSE 0 END), COUNT(DISTINCT(session_id))) AS conversion_rate,
  SAFE_DIVIDE(SUM(CASE WHEN event_type = 'ORDER' THEN revenue ELSE 0 END), SUM(CASE WHEN sale_through = TRUE THEN 1 ELSE 0 END)) AS avg_order_value,
  SAFE_DIVIDE(SUM(CASE WHEN event_type = 'ORDER' THEN revenue ELSE 0 END), COUNT(DISTINCT(session_id))) AS per_session_value

FROM events.{api_key}  -- Insert API key

WHERE 
  i_site_name = '{site_key}'  -- Insert Site key
  AND _PARTITIONTIME >= TIMESTAMP('{start_date}')
  AND _PARTITIONTIME <= TIMESTAMP('{end_date}')
  AND terminated = FALSE
  AND ((source = TRUE) OR (source = FALSE AND enriched = TRUE))
  AND session_type = "search"

GROUP BY 1`
  },
  {
    id: "query-analysis",
    name: "Query Analysis",
    description: "Analyze query performance segments (Head, Torso, Tail) classifying search counts, word count lengths, click-through-rates, and order units.",
    defaultSql: `WITH searchesTable AS (
   SELECT 
        query,
        COUNT(DISTINCT session_id) AS hits,
        SUM(CASE WHEN event_type = 'SEARCH' THEN 1 ELSE 0 END) AS searches
   FROM events.{api_key}  -- insert API key
   WHERE 
        i_site_name = '{site_key}' -- insert site key
        AND _PARTITIONTIME >= TIMESTAMP('{start_date}')
        AND _PARTITIONTIME <= TIMESTAMP('{end_date}')
        AND terminated = FALSE
        AND ((source = TRUE) OR (source = FALSE AND enriched = TRUE))
        AND autoSuggestPayload.autosuggest_type <> 'POPULAR_PRODUCTS'
        AND session_type = 'search'
        AND query IS NOT NULL
   GROUP BY 1
),

limitsTable AS (
  SELECT freq, MAX(hits) AS limits
  FROM (
    SELECT *,
      CASE
        WHEN percentile <= 1 THEN 'Head'
        WHEN percentile >= 5 THEN 'Tail'
        ELSE 'Torso'
      END AS freq
    FROM (
      SELECT *, NTILE(16) OVER (ORDER BY hits DESC) AS percentile
      FROM searchesTable
    )
  )
  GROUP BY 1
),

classifiedTable AS (
SELECT 
    query,
    hits,
    CASE 
        WHEN hits > (SELECT limits FROM limitsTable WHERE freq = 'Torso') THEN 'head'
        WHEN hits <= (SELECT limits FROM limitsTable WHERE freq = 'Tail') THEN 'tail'
        ELSE 'torso'
    END AS frequency,

    CASE 
        WHEN (LENGTH(TRIM(query)) - LENGTH(REPLACE(TRIM(query), ' ', '')) + 1) > 3 THEN '3+'
        ELSE CAST((LENGTH(TRIM(query)) - LENGTH(REPLACE(TRIM(query), ' ', '')) + 1) AS STRING)
    END AS No_words,

    CASE
        WHEN REGEXP_CONTAINS(query, '^[0-9]+$') THEN 'Numeric'
        WHEN REGEXP_CONTAINS(query, '[0-9]') THEN 'Alphanumeric'
        ELSE 'Text'
    END AS Is_numeric,

    'Overall' AS overall

FROM searchesTable
),

mainData AS (
SELECT
    DATE(_PARTITIONTIME) AS date,
    query,
    device.type AS device,
    ANY_VALUE(original_query) AS original_query,
    COUNT(DISTINCT user_id) AS users,
    COUNT(DISTINCT JSON_EXTRACT(payload, '$.visit_id')) AS visitId,
    SUM(CASE WHEN event_type = 'VISIT' THEN 1 ELSE 0 END) AS visitEvents,
    COUNT(DISTINCT session_id) AS hits,
    SUM(CASE WHEN event_type = 'PRODUCT_IMPRESSIONS' THEN 1 ELSE 0 END) AS impressions,
    SUM(CASE WHEN event_type = 'SEARCH' THEN 1 ELSE 0 END) AS searches,
    SUM(CASE WHEN event_type = 'PRODUCT_PAGE_VIEW' THEN 1 ELSE 0 END) AS prodView,
    SUM(CASE WHEN event_type = 'CART' THEN 1 ELSE 0 END) AS cartQuantity,
    COUNT(DISTINCT CASE WHEN event_type = 'CLICK' THEN session_id END) AS click_throughs,
    SUM(CASE WHEN event_type = 'CLICK' THEN 1 ELSE 0 END) AS clicks,
    SUM(CASE WHEN event_type = 'CART' THEN 1 ELSE 0 END) AS carts,
    SUM(CASE WHEN event_type = 'ORDER' THEN 1 ELSE 0 END) AS orders,
    COUNT(DISTINCT CASE WHEN event_type = 'ORDER' THEN session_id END) AS sale_throughs,
    SUM(CASE WHEN event_type = 'ORDER' THEN quantity ELSE 0 END) AS units,
    SUM(CASE WHEN event_type = 'ORDER' THEN revenue ELSE 0 END) AS revenue

FROM events.{api_key}  -- insert API key
WHERE 
    i_site_name = '{site_key}'  -- insert site key
    AND _PARTITIONTIME >= TIMESTAMP('{start_date}')
    AND _PARTITIONTIME <= TIMESTAMP('{end_date}')
    AND terminated = FALSE
    AND ((source = TRUE) OR (source = FALSE AND enriched = TRUE))
    AND autoSuggestPayload.autosuggest_type <> 'POPULAR_PRODUCTS'
    AND session_type = 'search'
    AND query IS NOT NULL

GROUP BY 1,2,3
)

SELECT
    date,
    a.query,
    frequency,
    No_words,
    Is_numeric,
    SUM(users) AS users,
    SUM(a.hits) AS hits,
    SUM(searches) AS searches,
    SUM(clicks) AS clicks,
    SUM(carts) AS carts,
    SUM(orders) AS orders,
    SUM(units) AS units,
    SUM(revenue) AS revenue,
    SUM(click_throughs) AS click_throughs,
    SUM(sale_throughs) AS sale_throughs

FROM mainData a
LEFT JOIN classifiedTable b
ON a.query = b.query

GROUP BY 1,2,3,4,5
ORDER BY hits DESC`
  },
  {
    id: "old-zero-query",
    name: "OLD Zero Query",
    description: "Map Zero Queries with session events to identify True Zero Queries vs. AI-resolved queries, with spellcheck and semantic search outcomes.",
    defaultSql: `/*
Purpose: Zero Queries Mapping with Session Table
Author: Aditya Agrawal
Edits History: 09 July 2025
*/

with dateQueryLevel as  (
  SELECT
        DATE(_PARTITIONTIME) as date,
        -- JSON_EXTRACT(searchResponse,"$['searchMetaData']['queryParams']['store.id']") store_id,
        lower(trim(replace(replace(JSON_EXTRACT(searchResponse,"$['mimirDebug']['metadata']['original']['query']"),'"'," "),'%20'," "))) AS query,
        count(distinct(requestId)) AS requests,
        MAX(COALESCE(CAST(JSON_EXTRACT(searchResponse,"$['mimirDebug']['metadata']['original']['numberOfProducts']") as INT64),0 )) AS no_prods_original,
        MAX(COALESCE(CAST(JSON_EXTRACT(searchResponse, '$.response.numberOfProducts')as INT64),0)) as no_prods_searchResponse,
        MAX(COALESCE(CAST(JSON_EXTRACT(searchResponse,"$['mimirDebug']['metadata']['spellcheck']['numberOfProducts']") as INT64),0)) AS spellcheck_numberOfProducts,
        MAX(JSON_EXTRACT(searchResponse,"$['mimirDebug']['metadata']['spellcheck']['query']")) as spellcheck_query,
        MAX(COALESCE(CAST(JSON_EXTRACT(searchResponse,"$['mimirDebug']['metadata']['minimum_match']['numberOfProducts']") as INT64),0)) AS mm_numberOfProducts,
        MAX(JSON_EXTRACT(searchResponse,"$['mimirDebug']['metadata']['minimum_match']['query']")) mm_query,
        MAX(COALESCE(CAST(JSON_EXTRACT(searchResponse,"$['mimirDebug']['metadata']['query_intent']['numberOfProducts']") as INT64),0)) AS qis_numberOfProducts,
        MAX(COALESCE(CAST(JSON_EXTRACT(searchResponse,"$['mimirDebug']['metadata']['semantic_search']['numberOfProducts']") as INT64),0)) AS semantic_search_numberOfProducts,
        max(JSON_EXTRACT(searchResponse,"$['mimirDebug']['metadata']['semantic_search']['query']")) as ss_query

       FROM search.{api_key}
        WHERE  
          DATE(_PARTITIONTIME) >= '{start_date}'
   AND DATE(_PARTITIONTIME) <= '{end_date}'

            and iSiteName = '{site_key}' -- Insert Site key
             AND 
             ruleSetName = "search"
            AND statusCode = 0
        and JSON_EXTRACT(searchResponse,"$['mimirDebug']['metadata']['original']['redirect']") IS NULL 
        AND JSON_EXTRACT(searchResponse,"$['mimirDebug']['metadata']['original']['query']") IS NOT NULL 
        AND JSON_EXTRACT(searchResponse,"$['mimirDebug']['metadata']['original']['query']") <> '"*"'
GROUP BY 1, 2
),

searchesTable as (
   SELECT query,
----------------- whatever be called searches here, head tail torso, will be calculated on that
                     COUNT(DISTINCT(session_id)) AS hits
                    ,sum(CASE WHEN event_type = "SEARCH" THEN 1 ELSE 0 END) AS searches   
          FROM events.{api_key}
  WHERE 
      DATE(_PARTITIONTIME) >= '{start_date}'
   AND DATE(_PARTITIONTIME) <= '{end_date}'

   AND 
    terminated = FALSE
    AND ((source = TRUE) OR (source = FALSE AND enriched = TRUE))
                           and autoSuggestPayload.autosuggest_type <>'POPULAR_PRODUCTS'              ----edit2
    AND session_type ='search'
    and query is not null
  GROUP BY 1
)
,

limitsTable as (
  select freq, max(hits) as limits
  from  (
  select * , CASE
    WHEN percentile <= 1 THEN 'Head'
    WHEN percentile >= 5 THEN 'Tail'
    ELSE 'Torso' end as freq,
        
  from (select *, NTILE(16) OVER (ORDER BY hits DESC) AS percentile, 
 FROM searchesTable)
)
  group by 1
),

classifiedTable as (
select query,hits, (case when hits > (select limits from limitsTable where freq= 'Torso') then 'head' when hits <= (select limits from limitsTable where freq= 'Tail')  then 'tail' else 'torso' end  ) as frequency,  CASE WHEN (LENGTH(LTRIM(RTRIM( query)) )-LENGTH(REPLACE(LTRIM(RTRIM( query))," ",""))+1) > 3
       THEN "3+" ELSE CAST((LENGTH(LTRIM(RTRIM( query)) )-LENGTH(REPLACE(LTRIM(RTRIM( query))," ",""))+1) as string) END AS No_words
  ,CASE
    WHEN REGEXP_CONTAINS(query, '^[0-9]+$') THEN "Numeric"
    WHEN REGEXP_CONTAINS(query, '[0-9]') THEN "Alphanumeric"
    ELSE "Text"
  END AS Is_numeric,
  "Overall" as overall
  
   from searchesTable),

sess as (

select 
 DATE(_PARTITIONTIME) as date,
query,

lower(trim(replace(original_query,"%20"," "))) as original_query,
sum(case when event_type = "SEARCH" then 1 else 0 end) as searches,
count(distinct(session_id)) as hits,
sum(case when event_type = "CLICK" then 1 else 0 end) as clicks,
sum(case when event_type = "PRODUCT_PAGE_VIEW" then 1 else 0 end) as prodView,
sum(case when event_type = "CART" then 1 else 0 end) as carts,
sum(case when event_type = "ORDER" then 1 else 0 end) as orders,
sum(case when sale_through is TRUE then 1 else 0 end) as sale_through,
sum(case when click_through is TRUE then 1 else 0 end) as click_through,
SUM(CASE WHEN event_type ='ORDER' THEN quantity ELSE 0 END) AS units,
sum(case when event_type ="ORDER" then revenue else 0 end) as revenue,
sum(case when event_type = "PRODUCT_IMPRESSIONS" then 1 else 0 end) as impressions

FROM events.{api_key}

WHERE ((source = true) or (source = false  and enriched = true))
and terminated = false
and session_type = 'search'
and i_site_name ='{site_key}' -- insert site key
and (autoSuggestType != 'POPULAR_PRODUCTS' or autoSuggestType is NULL)
and DATE(_PARTITIONTIME) >= '{start_date}'
   AND DATE(_PARTITIONTIME) <= '{end_date}'

GROUP BY 1,2,3
),

zq as
(SELECT 
date,
-- store_id,
query,
CASE WHEN no_prods_searchResponse = no_prods_original and no_prods_original = 0 THEN 'TrueZQ'
WHEN no_prods_searchResponse >0 and no_prods_original = 0 THEN 'ResolvedZQ'
WHEN no_prods_original>0 then 'NonZero'
ELSE 'Unknown' END as ZQType,
no_prods_original,
CASE 
WHEN spellcheck_query is not NULL then concat("SpellCheck: ",spellcheck_query,"; ", no_prods_searchResponse)
WHEN qis_numberOfProducts > 0 then concat ("QIS: ", no_prods_searchResponse)
WHEN ss_query is not null then concat("SemanticSearch: ", no_prods_searchResponse)
WHEN mm_query is not NULL then concat("MultiMatch: ", no_prods_searchResponse)
ELSE concat("AI-models: ", no_prods_searchResponse) END AS Resolution,

SUM(requests) as requests

FROM dateQueryLevel
GROUP BY 1,2,3,4,5)

select sess.*, zq.*,ct.*
from sess left join zq
on sess.original_query = zq.query
and sess.date = zq.date
left join classifiedTable ct
on sess.query=ct.query`
  },
  {
    id: "recs-experience",
    name: "recs(experience)",
    description: "Analyze recommendations experience data mapping pagetype, widgets, clicks, impressions (hits), click-through rate, carts, and order revenues.",
    defaultSql: `SELECT
  FORMAT_DATE('%Y-%m-%d', date) AS date,
  Pagetype,
   Widget,
   impressions AS hits,
  clicks,
  click_through,
  carts,
  orders,
  sale_through,
  CAST(revenue AS INT) as revenue,
FROM (
  SELECT
   DATE(_PARTITIONTIME) as date,
    experience_pagetype as Pagetype,
    experience_widget as Widget,
    SUM(CASE WHEN new_visit IS TRUE THEN 1 ELSE 0 END) AS Visits,
    SUM(CASE WHEN event_type = "EXPERIENCE_IMPRESSION" THEN 1 ELSE 0 END) AS impressions,
    SUM(CASE WHEN event_type ="CLICK" THEN 1 ELSE 0 END) AS Clicks,
    (SUM(CASE WHEN click_through = TRUE THEN 1 ELSE 0 END)) AS click_through,
    SUM(CASE WHEN event_type ="CART" THEN 1 ELSE 0 END) AS Carts,
    SUM(CASE WHEN event_type ="ORDER" THEN 1 ELSE 0 END) AS orders,
    SUM(CASE WHEN sale_through = TRUE THEN 1 ELSE 0 END) AS sale_through,
    SUM(CASE WHEN event_type ="ORDER" THEN revenue ELSE 0 END) AS Revenue,
FROM events.{api_key}  -- insert API key
WHERE i_site_name = '{site_key}'  -- insert site key
AND terminated = FALSE
AND (source = TRUE OR (source=FALSE AND enriched=TRUE))
AND            DATE(_PARTITIONTIME) >= '{start_date}'
   AND DATE(_PARTITIONTIME) <= '{end_date}'
AND LOWER(session_type) ='experience'
GROUP BY 1,2,3
ORDER BY orders DESC)`
  },
  {
    id: "top-200-queries-revenue",
    name: "Top 200 Queries ordered by revenue",
    description: "Identify top 200 search terms driving the highest revenue, calculating CTR, cart-through rate, and average order values.",
    defaultSql: `SELECT
  query,
  ANY_VALUE(original_query) AS original_query,

  -- Core metrics
  COUNT(DISTINCT session_id) AS hits,

  SUM(CASE WHEN event_type = 'CLICK' THEN 1 ELSE 0 END) AS clicks,

  COUNT(DISTINCT CASE WHEN event_type = 'CART' THEN session_id END) AS carts,

  COUNT(DISTINCT CASE WHEN event_type = 'ORDER' THEN session_id END) AS orders,

  -- Revenue
  SUM(CASE 
        WHEN event_type = 'ORDER' THEN revenue 
        ELSE 0 
      END) AS revenue,

  -- CTR = Clicks / Hits
  SAFE_DIVIDE(
    SUM(CASE WHEN event_type = 'CLICK' THEN 1 ELSE 0 END),
    COUNT(DISTINCT session_id)
  ) AS ctr,

  -- Cart Through Rate = Carts / Hits
  SAFE_DIVIDE(
    COUNT(DISTINCT CASE WHEN event_type = 'CART' THEN session_id END),
    COUNT(DISTINCT session_id)
  ) AS cart_through_rate,

  -- AOV = Revenue / Orders
  SAFE_DIVIDE(
    SUM(CASE WHEN event_type = 'ORDER' THEN revenue ELSE 0 END),
    COUNT(DISTINCT CASE WHEN event_type = 'ORDER' THEN session_id END)
  ) AS aov,

  -- PSV = Revenue / Hits
  SAFE_DIVIDE(
    SUM(CASE WHEN event_type = 'ORDER' THEN revenue ELSE 0 END),
    COUNT(DISTINCT session_id)
  ) AS psv

FROM events.{api_key} -- change API key

WHERE
  i_site_name = '{site_key}' -- insert site key
  AND terminated = FALSE
  AND ((source = TRUE) OR (source = FALSE AND enriched = TRUE))

  AND session_type = 'search'
  AND query IS NOT NULL
  AND query != ''
  AND _PARTITIONTIME >= TIMESTAMP('{start_date}')
  AND _PARTITIONTIME <= TIMESTAMP('{end_date}')

GROUP BY query

ORDER BY revenue DESC
LIMIT 200;`
  },
  {
    id: "top-500-products-sitewise",
    name: "Top 500 Products sitewise data",
    description: "Perform sitewise product metrics aggregation identifying top 500 items by revenue, click counts, add-to-carts, and conversion ratios.",
    defaultSql: `SELECT
  product_ids,

  -- Core metrics
  COUNT(DISTINCT session_id) AS hits,

  SUM(CASE WHEN event_type = 'CLICK' THEN 1 ELSE 0 END) AS clicks,

  COUNT(DISTINCT CASE WHEN event_type = 'CART' THEN session_id END) AS carts,

  COUNT(DISTINCT CASE WHEN event_type = 'ORDER' THEN session_id END) AS orders,

  -- Conversion Rate
  SAFE_DIVIDE(
    COUNT(DISTINCT CASE WHEN event_type = 'ORDER' THEN session_id END),
    COUNT(DISTINCT session_id)
  ) AS conversion_rate,

  -- Revenue
  SUM(CASE 
        WHEN event_type = 'ORDER' THEN revenue 
        ELSE 0 
      END) AS revenue

FROM events.{api_key} -- Insert API key

WHERE
  i_site_name = '{site_key}' -- insert site key
  AND terminated = FALSE
  AND _PARTITIONTIME >= TIMESTAMP('{start_date}')
  AND _PARTITIONTIME <= TIMESTAMP('{end_date}')
  -- AND session_type = 'search'

GROUP BY product_ids
ORDER BY revenue DESC
LIMIT 500;`
  },
  {
    id: "search-queries-all-performance",
    name: "Search Queries - All (query performance)",
    description: "Aggregate performance indices across all search queries reporting click-through rate, conversion rate, clicks, carts, and units.",
    defaultSql: `SELECT
  query AS original_query,

  SUM(CASE WHEN event_type = 'SEARCH' THEN 1 ELSE 0 END) AS hits,

  SUM(CASE WHEN event_type = 'CLICK' THEN 1 ELSE 0 END) AS clicks,

  SUM(CASE WHEN event_type = 'CLICK' THEN 1 ELSE 0 END) AS clickThroughs,

  SUM(CASE WHEN event_type = 'CART' THEN 1 ELSE 0 END) AS carts,

  SUM(CASE WHEN event_type = 'ORDER' THEN quantity ELSE 0 END) AS orders,

  SUM(CASE WHEN event_type = 'ORDER' THEN 1 ELSE 0 END) AS sale_throughs,


  SAFE_DIVIDE(
    SUM(CASE WHEN event_type='CLICK' THEN 1 ELSE 0 END),
    SUM(CASE WHEN event_type='SEARCH' THEN 1 ELSE 0 END)
  ) * 100 AS click_through_rate,

  SAFE_DIVIDE(
    SUM(CASE WHEN event_type='ORDER' THEN 1 ELSE 0 END),
    SUM(CASE WHEN event_type='SEARCH' THEN 1 ELSE 0 END)
  ) * 100 AS conversion_rate

FROM events.{api_key}  -- Insert API key

WHERE
  _PARTITIONTIME BETWEEN TIMESTAMP('{start_date}') AND TIMESTAMP('{end_date}')
  AND ((source = true) OR (source = false AND enriched = true))
  AND terminated = false
  AND i_site_name = '{site_key}' -- insert site key

GROUP BY query
ORDER BY hits DESC;`
  },
  {
    id: "zero-query-console-reports",
    name: "SQL code for zero query powering console reports",
    description: "Map and report zero-product queries directly powering standard Unbxd console interfaces to locate redirects and did-you-means.",
    defaultSql: `SELECT query, sum(requests) as hits
from (
    select date(_PARTITIONTIME) as date
    , lower(ltrim(rtrim(coalesce(JSON_EXTRACT(searchResponse,"$['debug']['original.q']"), JSON_EXTRACT(searchResponse,"$['searchMetaData']['queryParams']['q']")), '"'), '"')) as query
    , max(JSON_EXTRACT(searchResponse, '$.response.numberOfProducts')) as no_prods
    , JSON_EXTRACT(searchResponse, '$.redirect.value') as redirect_1
    , JSON_EXTRACT(searchResponse, "$['mimirDebug']['components']['brewer']['metadata']['params']['redirect']") as redirect_2
    , max(JSON_EXTRACT(searchResponse, '$.didYouMean')) as did_u_mean
    , count(requestId) as requests
    from search.{api_key}  -- insert site key
    WHERE
      _PARTITIONTIME = TIMESTAMP('{start_date}')
      --AND _PARTITIONTIME <= TIMESTAMP('{end_date}’)
      AND ruleSetName = "search"
      AND statusCode = 0
    group by date, query, redirect_1, redirect_2
    having no_prods = "0"
)
where
    redirect_1 is null
    and redirect_2 is null
    and requests > 0
    and query is not null
GROUP BY query
ORDER BY hits DESC`
  },
  {
    id: "zero-query-decks-aggregated",
    name: "SQL code for zero query powering the decks (from pre-aggregated table)",
    description: "Quickly generate ZQ query mapping pulling from the central pre-aggregated analysts table to power slide deck indicators.",
    defaultSql: `SELECT query, SUM(requests)
FROM \`warehouse-167108.unbxd_analysts.centralDataDumpZQ\`
  WHERE
    date = '{start_date}'
    AND date <= '{end_date}'
    AND isiteName = '{site_key}'  -- insert site key
    AND did_you_mean_flag IS FALSE
    AND query IS NOT NULL
    AND UPPER(TRIM(query)) != 'NULL'
    AND TRIM(query) != ''
    GROUP BY 1
    ORDER BY 2 DESC`
  }
];
