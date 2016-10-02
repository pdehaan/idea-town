const gulp = require('gulp');
const gutil = require('gulp-util');
const Joi = require('joi');

const experiments = require('../build/api/experiments.json');

const COLOR_REGEX = /^#[0-9A-F]{6}$/i;
const EMPTY_OR_NULL = ['', null];

const EXPERIMENTS_SCHEMA = Joi.object().keys({
  id: Joi.number().integer().required(),
  title: Joi.string().required(),
  short_title: Joi.string().allow(...EMPTY_OR_NULL).optional(),
  slug: Joi.string().required(),
  thumbnail: Joi.string().required(),
  description: Joi.string().required(),
  introduction: Joi.string().required(),
  version: Joi.string().required(),
  image_twitter: Joi.string().allow(...EMPTY_OR_NULL).optional(),
  image_facebook: Joi.string().allow(...EMPTY_OR_NULL).optional(),
  min_release: Joi.number().allow(null).optional(),
  pre_feedback_copy: Joi.string().allow(...EMPTY_OR_NULL).optional(),
  pre_feedback_image: Joi.string().allow(...EMPTY_OR_NULL).optional(),
  changelog_url: Joi.string().uri().optional(),
  contribute_url: Joi.string().uri().required(),
  bug_report_url: Joi.string().uri().required(),
  discourse_url: Joi.string().uri().optional(),
  privacy_notice_url: Joi.string().uri().required(),
  measurements: Joi.string().required(),
  xpi_url: Joi.string().uri().required(),
  addon_id: Joi.string().required(),
  gradient_start: Joi.string().regex(COLOR_REGEX).required(),
  gradient_stop: Joi.string().regex(COLOR_REGEX).required(),
  details: Joi.array().items(Joi.object().keys({
    headline: Joi.string().label('details.headline').required(),
    image: Joi.string().label('details.image').required(),
    copy: Joi.string().label('details.copy').required()
  })).min(1).required(),
  tour_steps: Joi.array().items(Joi.object().keys({
    image: Joi.string().label('tour_steps.image').required(),
    copy: Joi.string().label('tour_steps.copy').required()
  })).min(1).required(),
  notifications: Joi.array().items(Joi.object().keys({
    id: Joi.number().integer().label('notifications.id').required(),
    title: Joi.string().label('notifications.title').required(),
    text: Joi.string().label('notifications.text').required(),
    notify_after: Joi.date().label('notifications.notify_after').required()
  })).optional(),
  contributors: Joi.array().items(Joi.object().keys({
    display_name: Joi.string().label('contributors.display_name').required(),
    title: Joi.string().allow(...EMPTY_OR_NULL).label('contributors.title').optional(),
    avatar: Joi.string().label('contributors.avatar').required()
  })).min(1).required(),
  url: Joi.string().required(),
  html_url: Joi.string().required(),
  installations_url: Joi.string().required(),
  survey_url: Joi.string().uri().required(),
  created: Joi.date().required(),
  modified: Joi.date().required(),
  order: Joi.number().integer().required()
});

gulp.task('yaml-lint', ['content-experiments-json'], (done) => {
  validateExperiments(experiments, EXPERIMENTS_SCHEMA, (err, data) => {
    if (err) {
      const msg = err.details.reduce((prev, {slug, message}) => {
        prev.push(`- [${slug}] ${message}`);
        return prev;
      }, []).join('\n    ').replace(/&#x23;/g, '#');
      return done(new gutil.PluginError('yaml-lint', msg));
    }
    return done();
  });
});

function validateExperiments(data, schema, cb) {
  const validateOptions = {
    abortEarly: false,
    allowUnknown: false
  };

  const _schema = Joi.array().items(schema);
  Joi.validate(data.results, _schema, validateOptions, (err, data) => {
    if (err) {
      err.details = err.details.map((e) => {
        const idx = parseInt(e.path, 10);
        // Inject the experiment slug into the schema for more better error messages.
        e.slug = data[idx].slug;
        return e;
      });
      return cb(err);
    }
    return cb(null, data);
  });
}
