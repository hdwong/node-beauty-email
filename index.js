"use strict";
let core, config, logger, client,
    m = require('nodemailer'), mhtt = require('nodemailer-html-to-text');

let serviceName = 'email';
let email = {
  assert: (error) => {
    if (error) {
      logger.error(error);
      throw '[' + serviceName + '] ' + error;
    }
  },
  init: (name, c) => {
    serviceName = name;
    core = c;
    logger = core.getLogger(serviceName);
    config = core.getConfig(serviceName);
    if (config.host === undefined) {
      throw 'SMTP host is not defined.';
    }
    config.port = config.port || 25;
    if (config.email === undefined) {
      throw 'Sender email is not defined';
    }
    let conf = {
      host: config.host,
      port: config.port,
      secure: config.secure || false,
      ignoreTLS: true
    };
    if (config.user !== undefined && config.password !== undefined) {
      conf.auth = {
        user: config.user,
        pass: config.password
      };
    }
    client = m.createTransport(conf);
    client.use('compile', mhtt.htmlToText());
    if (!config.enable_api) {
      // disable api
      delete email.post_send;
    }
  },
  uninit: () => {
    if (client) {
      client.close();
    }
  },
  send: (options, next) => {
    client.sendMail(options, (error, result) => {
      email.assert(error);
      next(result);
    });
  },
  post_send: (req, res, next) => {
    if (!req.body || req.body.to === undefined ||
        req.body.subject === undefined || req.body.body === undefined) {
      throw 'Params is wrong';
    }
    let options = {
      to: req.body.to,
      subject: req.body.subject,
      html: req.body.body
    };
    if (config.name !== undefined) {
      options.from = config.name + '<' + config.email + '>';
    } else {
      options.from = config.email;
    }
    if (req.body.text !== undefined) {
      options.text = req.body.text;
    }
    email.send(options, next);
  }
};

module.exports = email;
