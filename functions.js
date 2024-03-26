import { Client } from '@hubspot/api-client';
import config from './config.js';
import axios from 'axios';

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
    const response = await axios({
      url: `https://api.hubapi.com/crm/v3/objects/contacts/search`,
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: `Bearer ${config.HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email,
              },
            ],
          },
        ],
        properties: [
          'createdate',
          'firstname',
          'lastname',
          'email',
          'canal_de_captacion',
          'sub_canal_de_captacion',
          'desarrollo',
          'lifecyclestage',
        ],
      },
    });
    // console.log(response.data.results[0]?.properties.email);
    const emailValidation = response.data.results[0]?.properties.email;

    if (email !== emailValidation) {
      const apiResponse = await hubspotClient.crm.contacts.basicApi.create({
        properties,
      });
      console.log(
        'Contact created successfully.',
        JSON.stringify(apiResponse, null, 2)
      );
      return apiResponse;
    } else {
      console.log('Contact is already created');
    }
  } catch (error) {
    console.error(
      `Failed to create contact: ${error.message}`,
      error.response ? JSON.stringify(error.response, null, 2) : ''
    );
    throw error;
  }
};

// createHubSpotContact('Raul', 'Loyola', '5541915469', 'raul@openai.com');
