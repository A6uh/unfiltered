import { 
  Devvit,
  getSetting,
  RedditAPIClient,
 } from '@devvit/public-api';
 import {
  CommentSubmit,
  CommentUpdate,
  PostSubmit,
  PostUpdate,
  Metadata,
} from '@devvit/protos';


const reddit = new RedditAPIClient();

//Add Settings Fields
Devvit.addSettings([
  {
    type: 'string',
    name: 'usernames',
    label: 'Whitelisted Usernames (Seperate each with a comma, for ex. u/username, u/username, u/username)',
    onValidate: (event) => {
      const badCommas = checkCommas(event.value);
      //const badSpaces = checkSpaces(event.value);
      if (badCommas) {
        return 'Found a comma without a space: \nEnsure each entry has a space after every comma'
      }
    }
  },
  {
    type: 'string',
    name: 'keywords',
    label: 'Whitelisted keywords (Seperate each with a comma, for ex. word, word, some.link.com)',
    onValidate: (event) => {
      const badCommas = checkCommas(event.value);
      //const badSpaces = checkSpaces(event.value);
      if (badCommas) {
        return 'Found a comma without a space: \nEnsure each entry has a space after every comma'
      }
    }
  },
]);

Devvit.addTrigger({
  event: Devvit.Trigger.CommentUpdate,
  async handler(request: CommentUpdate, metadata?: Metadata) {
    //In case there is a delay in the trigger and comment is deleted during that time (Personally observed)
    if (request.comment?.deleted){
      return;
    }
    const author = request.author?.name;
    const body = request.comment?.body;
    const id = request.comment?.id;
    const usernames = await getSetting(`usernames`, metadata);
    const keywords = await getSetting(`keywords`, metadata);
    console.log(author, body, id, usernames, keywords);
    //Check if author and body match whitelisted usernames or keywords
    if (compareToSettings(author, body, usernames, keywords)) {
      if (typeof id === 'string' && id !== ''){
        const comment = await reddit.getCommentById(id, metadata);
        //comment.bannedBy returns true, false, or the name of the moderator
        if (comment.bannedBy !== "true" as any && comment.bannedBy !== "automoderator" as any && comment.bannedBy !== undefined) {
          console.log('Comment had been removed by a moderator');
          return;
        } else {
        comment.approve();
        console.log(`Comment approved`);
        }
      }
    }
  },
});

Devvit.addTrigger({
  event: Devvit.Trigger.CommentSubmit,
  async handler(request: CommentSubmit, metadata?: Metadata) {
    if (request.comment?.deleted){
      return;
    }
    const author = request.author?.name;
    const body = request.comment?.body;
    const id = request.comment?.id;
    const usernames = await getSetting(`usernames`, metadata);
    const keywords = await getSetting(`keywords`, metadata);

    //Check if author and body match whitelisted usernames or keywords
    //Additional check in case moderation is performed before the trigger (in case of delay)
    if (compareToSettings(author, body, usernames, keywords)) {
      if (typeof id === 'string' && id !== ''){
        const comment = await reddit.getCommentById(id, metadata);
        if (comment.bannedBy !== "true" as any && comment.bannedBy !== "automoderator" as any && comment.bannedBy !== undefined) {
          console.log('Comment had been removed by a moderator');
          return;
        } else {
        comment.approve();
        console.log(`Comment approved`);
        }
      }
    }
  },
});
Devvit.addTrigger({
  event: Devvit.Trigger.PostSubmit,
  async handler(request: PostSubmit, metadata?: Metadata) {
    if (request.post?.isLocked || request.post?.deleted){
      return;
    }
    const author = request.author?.name;
    const id = request.post?.id;
    const title = request.post?.title;
    const selftext = request.post?.selftext;
    const texts = (title ?? "") + " " + (selftext ?? "");
    const usernames = await getSetting(`usernames`, metadata);
    const keywords = await getSetting(`keywords`, metadata);

    //Check if author and body match whitelisted usernames or keywords
    if (compareToSettings(author, texts, usernames, keywords)) {
      if (typeof id === 'string' && id !== ''){
      const post = await reddit.getPostById(id, metadata);
      if (post.bannedBy !== "true" as any && post.bannedBy !== "automoderator" as any && post.bannedBy !== undefined) {
        console.log('Post had been removed by a moderator');
        return;
      } else {
        post.approve();
        console.log(`Post approved`);
      }
      }
    }
  },
});

Devvit.addTrigger({
  event: Devvit.Trigger.PostUpdate,
  async handler(request: PostUpdate, metadata?: Metadata) {
    if (request.post?.isLocked || request.post?.deleted){
      return;
    }
    const author = request.author?.name;
    const id = request.post?.id;
    const title = request.post?.title;
    const selftext = request.post?.selftext;
    const texts = (title ?? "") + " " + (selftext ?? "");
    const usernames = await getSetting(`usernames`, metadata);
    const keywords = await getSetting(`keywords`, metadata);

    //Check if author and body match whitelisted usernames or keywords
    if (compareToSettings(author, texts, usernames, keywords)) {
      if (typeof id === 'string' && id !== ''){
      const post = await reddit.getPostById(id, metadata);
      if (post.bannedBy !== "true" as any && post.bannedBy !== "automoderator" as any && post.bannedBy !== undefined) {
        console.log('Post had been removed by a moderator');
        return;
      } else {
        post.approve();
        console.log(`Post approved`);
      }
      }
    }
  },
});


//Validator function for formatting
function checkCommas(eventValue: string | undefined): boolean {
  if (typeof eventValue === 'string') {
    const hasCommaWithoutSpace = /,(?! )/.test(eventValue);

    return hasCommaWithoutSpace;
  }
  
  return false;
}
/*
//Find solution for phrases?

function checkSpaces(eventValue: string | undefined): boolean {
  if (typeof eventValue === 'string') {
    const hasSpaceWithoutComma = /[^,] /.test(eventValue);

    return hasSpaceWithoutComma;
  }
  
  return false;
}
*/

//Compare texts to preset whitelist
function compareToSettings(author: string | undefined, body: string | undefined, usernameSet: string | number | boolean | string[] | undefined, keywordSet: string | number | boolean | string[] | undefined): boolean {
  if (typeof usernameSet === 'string' && usernameSet !== '' && typeof author === 'string') {
    author = author.toLowerCase();
    const lowUsernameSet = usernameSet.toLowerCase();

    const usernames = lowUsernameSet.replace(/u\//g, '').split(', ');
      for (const username of usernames) {
        if (author === username) {
          return true;
        }
      }
  }
  if (typeof keywordSet === 'string' && keywordSet !== '' && typeof body === 'string') {
    body = body.toLowerCase();
    keywordSet = keywordSet.toLowerCase();

    const keywords = keywordSet.split(', ');
    for (const keyword of keywords) {
      if (body.includes(keyword)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Test Actions
 */

export default Devvit;
