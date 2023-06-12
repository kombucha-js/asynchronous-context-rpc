

function process_args_v1( method_args ) {
  // const __convert =  e=> typeof e === 'string' ? e : JSON.stringify( e );

  /*
   * for backward-compatibility, return a plain single object if only one
   * argument is specified; otherwise, return an array, except none is specified.
   */
  if ( method_args.length === 0 ) {
    // if no argument was specified, return null.
    return null;
  } else if ( method_args.length === 1 ) {
    // if only one argument was specified, return a single object.
    return method_args[0];
  } else {
    // if multiple arguments were specified, return an array.
    return [ ...method_args];
  }
}


// MODIFIED (Thu, 18 May 2023 17:45:04 +0900)
// always return array.
function process_args_v2( method_args ) {
  return [ ... method_args ];
};

const process_args = process_args_v2;

function parse_response( text ) {
  try {
    return JSON.parse( text );
  } catch ( e ) {
    return {
      status : 'error',
      value : {
        cause : 'invalid JSON error',
        text  : '```\n' + text + '\n```',
      },
    };
  }
}

const create_fetch_url = ( server_url, method_path, query_string )=>{
  let s = '';

  s += server_url;

  const path_string = method_path.join('/');

  if ( ! s.endsWith( '/' ) && ! path_string.startsWith('/')  ) {
    s+= '/';
  }

  s += path_string;

  if ( ! s.endsWith( '?' ) && ! path_string.startsWith( '?' )  ) {
    s += '?';
  }

  s += query_string;

  return s;
}


// const http_server_url  = http_server_url; // 'http://localhost:2000/api/';
// const http_method      = 'POST';

/*
 * 1. Now `create_callapi_bridge()` delegates all named arguments to `callapi` so
 * that `callapi()` can receive any named arguments
 *
 * 2. `http_frontend_callapi` takes the following five arguments.
 *
 *     nargs : object(
 *       http_method               : and(
 *                                     string(),
 *                                     or(
 *                                       equals( << 'POST' >> ),
 *                                       equals( << 'GET'  >> ),
 *                                       equals( << 'GET' >>  ))),
 *       http_server_url           : string(),
 *       http_authentication_token : string(),
 *       method_path               : array_of( string() ),
 *       method_args               : array_of( any() ),
 *     ),
 */
async function http_frontend_callapi( nargs ) {
  const {
    http_method                = ((v)=>{ throw new Error(`${v} is not specified`) })( 'http_method'   ),
    http_server_url            = ((v)=>{ throw new Error(`${v} is not specified`) })( 'http_server_url' ),
    http_authentication_token  = ((v)=>{ throw new Error(`${v} is not specified`) })( 'http_authentication_token' ),
    method_path                = ((v)=>{ throw new Error(`${v} is not specified`) })( 'method_path' ),
    method_args                = ((v)=>{ throw new Error(`${v} is not specified`) })( 'method_args' ),
  } = nargs;

  const http_headers = {
    'Content-Type': 'application/json',
  };

  if ( typeof http_authentication_token === 'string' ) {
    const tmp_token = http_authentication_token.trim();
    if ( 0 < tmp_token.length ) {
      http_headers['Authentication'] = 'Bearer ' + tmp_token;
    }
  }

  /*
   * === About `query_obj` variable ===
   *
   * If http_method is either 'HEAD' or 'GET', it only accepts the first
   * argument as a dictionary object; otherwise it send all arguments as an
   * array object in the JSON data.
   *
   * (Thu, 01 Jun 2023 14:45:35 +0900)
   */
  const create_fetch_options_and_query = ()=>{
    if ( http_method === 'HEAD' || http_method === 'GET' ) {
      const fetch_options        = { method:http_method, headers:http_headers };
      const query_obj = new URLSearchParams( (method_args.lenght === 0) || (typeof method_args[0] !== 'object') ? {} : method_args[0] );
      query_obj.sort();
      const query_string = query_obj.toString();
      return {
        fetch_options,
        query_string,
      };
    } else {
      const http_body = JSON.stringify( process_args( method_args ), null, 4 );
      const fetch_options        = { method: http_method, headers:http_headers, body:http_body };
      const query_string = '';
      return {
        fetch_options,
        query_string,
      };
    }
  };

  const {
    fetch_options, query_string
  } = create_fetch_options_and_query();

  const result         = await fetch( create_fetch_url( http_server_url , method_path , query_string ) , fetch_options );
  const response_text  = await result.text();
  // console.log( 'respoinse_text',  response_text );
  const response_json  = parse_response( response_text );

  console.log( 'The Result of API', response_json );

  if ( ( 'status' in response_json ) && ( response_json[ 'status' ] === 'succeeded' ) ) {
    return response_json
  } else {
    response_json[ Symbol.for( 'is_from_backend' ) ] = true;
    throw response_json;
  }
}

const dummy_callapi = (nargs)=>{
  const {
    method_args = [],
  } = nargs;
  console.log( 'callapi', '(', ...method_args , ')', nargs );
  return {
    status : 'succeeded',
    value : method_args
  }
};


function create_error_callapi( message ) {
  if ( typeof message !== 'string' ) {
    throw new TypeError( `an invalid value was specified as message argument; '${message}' ` );
  }

  return ( nargs )=>{
    const {
      method_args = [],
    } = nargs;
    console.log( 'callapi', '(', ...method_args , ')', nargs );

    return {
      status : 'error',
      value : message,
    }
  };
}

const error_callapi = create_error_callapi( 'Currently the API service is not available. Try it again, later.' );

module.exports.http_frontend_callapi = http_frontend_callapi;
module.exports.dummy_callapi         = dummy_callapi;
module.exports.error_callapi         = error_callapi;
// module.exports.callapi               = http_frontend_callapi;
module.exports.create_error_callapi  = create_error_callapi;

