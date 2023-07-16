// This lambda function queries Square for all inventory items with a low stock alert and returns the variant ids for all matches

import { Client, Environment, ApiError } from "square";

export const handler = async (event, context, callback) => {
  let responseObject;
  let client;
  const ALII_LOCATION_ID = "43FW6PWKP817H";

  const idsArray = [];
  const itemsArray = [];

  let calls = 1;

  try {
    if (!client)
      client = new Client({
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
        environment: Environment.Production,
      });
    const { catalogApi } = client;

    console.log(`API call #${calls}`);
    calls++;
    const res = await catalogApi.searchCatalogItems({
      customAttributeFilters: [
        {
          customAttributeDefinitionId: "CXWR2ZRG6M5DVNDZXRWISFHU",
          numberFilter: {
            min: "1",
          },
        },
      ],
    });
    let { matchedVariationIds, items, cursor } = res.result;
    matchedVariationIds.forEach((id) => idsArray.push(id));
    items.forEach((item) => itemsArray.push(item));

    while (cursor) {
      console.log(`API call #${calls}`);
      console.log("cursor:", cursor);
      calls++;
      const res = await catalogApi.searchCatalogItems({
        cursor,
        customAttributeFilters: [
          {
            customAttributeDefinitionId: "CXWR2ZRG6M5DVNDZXRWISFHU",
            numberFilter: {
              min: "1",
            },
          },
        ],
      });
      matchedVariationIds = res.result.matchedVariationIds;
      items = res.result.items;
      cursor = res.result.cursor;
      matchedVariationIds.forEach((id) => idsArray.push(id));
      items.forEach((item) => itemsArray.push(item));
    }

    const responseItems = [];
    idsArray.forEach((id) => {
      const newObj = {};
      newObj.id = id;
      itemsArray.forEach((item) => {
        item.itemData.variations.forEach((variation) => {
          if (variation.id === id) {
            newObj.name = (
              item.itemData.name +
              " " +
              variation.itemVariationData.name
            ).trim();
            newObj.target = parseInt(
              variation.customAttributeValues[
                "Square:ea60d4e4-4ed5-49fe-9abe-aec422c6bc7d"
              ].numberValue
            );
          }
        });
      });
      responseItems.push(newObj);
    });

    responseObject = {
      result: "success",
      ids: idsArray,
      items: responseItems,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      error.result.errors.forEach(function (e) {
        console.log(e.category);
        console.log(e.code);
        console.log(e.detail);
      });
    } else {
      console.log("Unexpected error occurred: ", error);
    }
    responseObject = {
      result: "failure",
      message: error.message,
    };
  }
  const response = {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(
      responseObject,
      (key, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged),
    ),
  };

  callback(null, response);
};
