# MuShop Storefront

Responsive eCommerce storefront built on microservices architecture.

- Built with `[UIkit](https://getuikit.com)`
- Templates courtesy of [Roman Chekurov](https://github.com/chekromul/uikit-ecommerce-template)

## Overview

### Technologies

The project leverages:

- [UIkit](https://getuikit.com)
- [axios](https://www.npmjs.com/package/axios)
- [Pug](https://pugjs.org)
- [Less](http://lesscss.org)
- [Gulp](https://gulpjs.com)

## Quick start

### Dependencies

<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Version</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="https://docker.com">Docker</a></td>
      <td>>= 1.12</td>
    </tr>
    <tr>
      <td><a href="https://docs.docker.com/compose/">Docker Compose</a></td>
      <td>>= 1.8.0</td>
    </tr>
    <tr>
      <td><a href="http://www.gnu.org/s/make">Make</a></td>
      <td>>= 3.81</td>
    </tr>
  </tbody>
</table>

### Local

```shell
# start dependent microservices
make compose

# start storefront
npm install
npm start
```

### Docker

```shell
# start storefront and backend
make up
```

### Shutdown

```shell
# stop all services
make down
```

## Copyright and Credits

[Shopping Categories Colection](https://thenounproject.com/jarosigrist/collection/shopping-categories) icons by Jaro Sigrist from Noun Project. Licensed under Creative Commons Attribution 3.0.

## License

This software is licensed under the MIT License © [Roman Chekurov](https://github.com/chekromul)
