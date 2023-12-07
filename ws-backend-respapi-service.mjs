
import express    from 'express';
import cors       from  'cors';

import { startService } from './service-utils.mjs';

import { loadContextFactory  } from './context-factory-loader.mjs' ;
import { filenameOfSettings, asyncReadSettings } from 'asynchronous-context/settings' ;

import {
  create_websocket_upgrader,
  create_multi_path_upgrade_handler,
  on_init_websocket_of_ws_backend,
} from './ws-backend-respapi.mjs' ;

import { typecast, schema  } from 'vanilla-schema-validator' ;
import { typesafe_function } from 'runtime-typesafety' ;

const create_service_factory = ( create_app, ports, handle_upgrade )=>{
  create_app = typesafe_function( create_app, {
    typesafe_input : schema.compile`array()`,
    typesafe_output : schema.compile`array_of(
      any(),
    )`,
  });

  function wrap(server) {
    return server;
  }

  const services = [];
  const sockets = new Set();
  return (
    ports.map(
      port=>(
        {
          start() {
            services.push(
              ...(
                create_app().map(
                  e=>{
                    const server = e.listen(
                      port,
                      (e)=>{
                        console.log( 'ws-server opened', 'C3FXWHjYwU0' );
                      }
                    );

                    server.on( 'error', (e)=>{
                      console.error( 'server-error', e );
                    })

                    server.on( 'connection', (socket)=>{
                      console.log( 'sZYTMC4A0I', 'connection');

                      sockets.add( socket );

                      socket.on( 'close', ()=>{
                        console.log( 'sZYTMC4A0I', 'socket.close()' );
                      })

                      socket.on( 'data', ()=>{
                        console.log( 'sZYTMC4A0I', 'socket.data()' );
                      })
                    });
                    server.on( 'upgrade', handle_upgrade );
                    return wrap(server);
                  }
                )
              )
            );
            console.log('nTPf8R8RExE', {services} );
          },

          stop() {
            services.forEach( e=>e.close(
              (e)=>{
                if ( e ) {
                  console.error( 'ws-server closed(with error)', e, 'C3FXWHjYwU0' );
                } else {
                  console.log( 'ws-server closed', 'C3FXWHjYwU0' );
                }
              }
            ));
            services.length = 0;
            console.log('nTPf8R8RExE', {services} );

            console.log( 'ws-server closed 2', 'C3FXWHjYwU0' );
            for ( const i of sockets.values() ) {
              i.destroy();
            }
          },
        }
      )
    )
  );
}

export { create_service_factory as create_service_factory };

schema.define`
  t_start_service_for_ws_backend : object(
    create_context : function(),
    event_handlers  : any(),
    path  : string(),
    ports : array_of(
      number()
    ),
  ),
`;
const start_service_for_ws_backend = (nargs)=>{
  const {
    create_context,
    event_handlers,
    ports,
    path
  } = typecast( schema.t_start_service_for_ws_backend(), nargs );

  const create_app = ()=>{
    // Initializing the app.
    const app = express();
    // app.use( cors( { origin : cors_origins } ) );
    // app.use(require('morgan')('dev'));
    app.use( (req,res,next)=>{
      console.log( 'req.path', req.path );
      next();
    });
    return [app];
  };

  return (
    create_service_factory(
      create_app,
      ports,
      create_multi_path_upgrade_handler(
        {
          [path] : (
            create_websocket_upgrader(
              async function on_init_websocket( websocket, req ) {
                on_init_websocket_of_ws_backend({ create_context, event_handlers, websocket, req });
              }
            )
          ),
        }
      )
    )
  );
};

export { start_service_for_ws_backend as start_service_for_ws_backend };

function default_cors_origins( origin, callback ) {
  console.error( 'WARNING : NO CORS SETTING FILE WAS SPECIFIED. THIS CAUSES ALLOWING FOR ALL DOMAINS.' );
  callback( null, /.*/ )
}


function loadService( serviceSettings ) {
  const {
    ports               = [],
    // cors_origins        = default_cors_origins,
    context_factory     = ((name)=>{throw new Error( `${name} is not defined` )})('context_factory'),
    path                = ((name)=>{throw new Error( `${name} is not defined` )})('path'),
    purge_require_cache = false,
  } = serviceSettings;

  if ( ( ports.length ?? 0 ) < 1 ) {
    console.error( `WARNING field 'ports' is missing in the setting file '${filenameOfSettings()}' the default values are applied.` );
    ports = [ 2000 ];
  }

  const event_handlers = {};

  const create_context = loadContextFactory( context_factory, purge_require_cache );

  return (
    start_service_for_ws_backend({
      create_context,
      event_handlers,
      path  ,
      ports ,
    })
  );
}
export { loadService as loadService };

async function startWsService() {
  const createService =
    async()=>{
      const settings = await asyncReadSettings();
      const serviceSettings = settings?.async_context_websocket_backend ?? {};
      return loadService( serviceSettings );
    };

  startService( createService );
};
export { startWsService as startService };


