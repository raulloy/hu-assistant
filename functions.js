import { Client } from '@hubspot/api-client';
import config from './config.js';

export const createHubSpotContact = async (
  firstname,
  lastname,
  phone,
  email
) => {
  const hubspotClient = new Client({
    accessToken: config.HUBSPOT_ACCESS_TOKEN,
  });

  const properties = {
    firstname,
    lastname,
    phone,
    email,
  };

  try {
    const apiResponse = await hubspotClient.crm.contacts.basicApi.create({
      properties,
    });
    console.log(
      'Contact created successfully.',
      JSON.stringify(apiResponse, null, 2)
    );
    return apiResponse;
  } catch (error) {
    console.error(
      `Failed to create contact: ${error.message}`,
      error.response ? JSON.stringify(error.response, null, 2) : ''
    );
    throw error;
  }
};
