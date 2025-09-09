const Alexa = require('ask-sdk-core');
const fetch = require('node-fetch');

/**
 * Requests budget information from YNAB's API and responde with this month's activity in the requested category
 * */
const SpentThisMonthIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SpentThisMonthIntent';
  },
  async handle(handlerInput) {
    // Get requested category from slots
    const spokenCategory = Alexa.getSlotValue(handlerInput.requestEnvelope, "Category");

    // Get access token from user's Alexa account
    const accessToken = handlerInput.requestEnvelope.context.System.user.accessToken;
    if (!accessToken) {
      return handlerInput.responseBuilder
        .speak("You'll need to link your YNAB account before I can check your budget. Please use the Alexa app to link your account.")
        .withLinkAccountCard()
        .getResponse();
    }
    
    // Get budget information from YNAB's API
    const response = await fetch("https://api.ynab.com/v1/budgets/default/categories", {
      headers: { "Authorization" : `Bearer ${accessToken}` }
    });
    if (!response.ok) {
      return handlerInput.responseBuilder
        .speak("Sorry, I was unable to connect to YNAB.")
        .getResponse();
    }
    const budget = await response.json();

    // Find a matching category in budget
    const categories = budget.data.category_groups.flatMap(g => g.categories);
    const cat = categories.find(c => c.name.toLowerCase().replace(/\s+/g, '').includes(spokenCategory.toLowerCase().replace(/\s+/g, '')));
    if (!cat) {
      return handlerInput.responseBuilder
        .speak(`Sorry, I was unable to find a ${spokenCategory} category in your budget`)
        .getResponse();
    }
    
    // Prepare response
    const dollars = -1 * Math.floor(cat.activity / 1000);
    const cents = -1 * Math.floor(cat.activity % 1000 / 10);
    const speakOutput = `You have spent ${dollars} dollars and ${cents} cents on ${cat.name} this month.`;

    // Respond
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  }
}

module.exports = SpentThisMonthIntentHandler;