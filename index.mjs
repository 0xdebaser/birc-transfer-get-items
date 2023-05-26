// This lambda function queries Square for all inventory items with a low stock alert and returns the variant ids for all matches

import { Client, Environment, ApiError } from "square";

export const handler = async (event, context, callback) => {
  let responseObject;
  let client;

  try {
    if (!client)
      client = new Client({
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
        environment: Environment.Production,
      });
    const { catalogApi } = client;

    const res = await catalogApi.searchCatalogItems({
      stockLevels: ["LOW", "OUT"],
      customAttributeFilters: [
        {
          customAttributeDefinitionId: "CXWR2ZRG6M5DVNDZXRWISFHU",
          numberFilter: {
            min: "1",
          },
        },
      ],
    });
    const { matchedVariationIds, items } = res.result;
    const responseItems = [];
    if (
      Array.isArray(items) &&
      items.length > 0 &&
      Array.isArray(matchedVariationIds) &&
      matchedVariationIds.length > 0
    ) {
      matchedVariationIds.forEach((id) => {
        // Find variation with matching id and set name
        items.forEach((item) => {
          item.itemData.variations.forEach((variation) => {
            if (variation.id === id) {
              const newObj = {
                id,
                name: variation.itemVariationData.name
                  ? item.itemData.name + " " + variation.itemVariationData.name
                  : item.itemData.name,
              };
              // Check target for matching variation
              newObj.target =
                item.hasOwnProperty("customAttributeValues") &&
                item.customAttributeValues.hasOwnProperty(
                  "Square:ea60d4e4-4ed5-49fe-9abe-aec422c6bc7d"
                )
                  ? item.customAttributeValues[
                      "Square:ea60d4e4-4ed5-49fe-9abe-aec422c6bc7d"
                    ].numberValue
                  : null;
              if (
                variation.hasOwnProperty("customAttributeValues") &&
                variation.customAttributeValues.hasOwnProperty(
                  "Square:ea60d4e4-4ed5-49fe-9abe-aec422c6bc7d"
                )
              )
                newObj.target =
                  variation.customAttributeValues[
                    "Square:ea60d4e4-4ed5-49fe-9abe-aec422c6bc7d"
                  ].numberValue;
              // Add new object to the array that's being sent back
              responseItems.push(newObj);
            }
          });
        });
      });
    }
    responseObject = {
      result: "success",
      ids: matchedVariationIds,
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
