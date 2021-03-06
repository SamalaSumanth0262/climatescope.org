'use strict'
import React from 'react'
import { PropTypes as T } from 'prop-types'
import { Link } from 'react-router-dom'

import NavGlobalMenu from './nav-global-menu'

import { environment, appTitle, appEdition } from '../config'

export default class PageHeader extends React.PureComponent {
  render () {
    return (
      <header className='page__header' role='banner'>
        <div className='inner'>
          <div className='page__headline'>
            <h1 className='page__title'><Link to='/' title='View page'>{appTitle} <em>{appEdition}</em></Link></h1>
            <p className='page__subtitle'>by <a href='http://www.newenergyfinance.com/' title='Visit Bloomberg NEF'><img alt='Bloomberg New Energy Finance logo' src='/assets/graphics/layout/logo-bnef-short-flat-neg.svg' /><span>Bloomberg NEF</span></a></p>
          </div>
          <nav className='page__prime-nav nav' role='navigation'>
            <NavGlobalMenu forHeader />
          </nav>
        </div>
      </header>
    )
  }
}

if (environment !== 'production') {
  PageHeader.propTypes = {
    location: T.object
  }
}
