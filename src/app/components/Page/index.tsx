import { observer } from 'mobx-react'; // eslint-disable-line no-unused-vars
import React from 'react';

// Styles
import StyledPage from './styles';

// Models
import Page from '../../models/page';

import Store from '../../store';

import { history } from '../../utils/storage';

interface Props {
  page: Page;
  selected: boolean;
}

@observer
export default class extends React.Component<Props, {}> {
  public componentDidMount() {
    const { page } = this.props;
    const { webview, id } = this.props.page;
    const tab = Store.getTabById(id);

    let historyId = -1;
    let lastURL = '';

    const updateData = async () => {
      if (lastURL === webview.getURL() && tab != null) {
        if (historyId !== -1) {
          const query = 'UPDATE history SET title = ?, url = ?, favicon = ? WHERE rowid = ?';
          const data = [tab.title, webview.getURL(), tab.favicon, historyId];
          history.run(query, data);
        }
      }
    };

    const updateInfo = ({
      url,
      isMainFrame,
      type,
    }: {
    url: string;
    isMainFrame: boolean;
    type: string;
    }) => {
      if (url) {
        if (!isMainFrame) return;
        page.url = url;

        updateData();
      }

      if (type === 'did-stop-loading') {
        tab.loading = false;
      }
    };

    webview.addEventListener('did-stop-loading', updateInfo);
    webview.addEventListener('did-navigate', updateInfo);
    webview.addEventListener('did-navigate-in-page', updateInfo);
    webview.addEventListener('will-navigate', updateInfo);

    webview.addEventListener(
      'page-title-updated',
      ({ title }: { title: string; explicitSet: string }) => {
        tab.title = title;
        updateData();
      },
    );

    webview.addEventListener(
      'load-commit',
      ({ url, isMainFrame }: { url: string; isMainFrame: boolean }) => {
        tab.loading = true;

        if (url !== lastURL && isMainFrame) {
          history.run(
            "INSERT INTO history(title, url, favicon, date) VALUES (?, ?, ?, DATETIME('now', 'localtime'))",
            [tab.title, url, tab.favicon],
            function callback() {
              historyId = this.lastID;
            },
          );
          lastURL = url;
        }
      },
    );

    webview.addEventListener('page-favicon-updated', ({ favicons }: { favicons: string[] }) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = async () => {
        if (request.readyState === 4) {
          if (request.status === 404) {
            tab.favicon = '';
          } else {
            tab.favicon = favicons[0];
          }
        }
      };

      request.open('GET', favicons[0], true);
      request.send(null);

      updateData();
    });
  }

  public render() {
    const { page, selected } = this.props;
    const { url } = page;

    return (
      <StyledPage selected={selected}>
        <webview src={url} style={{ height: '100%' }} ref={r => (page.webview = r)} />
      </StyledPage>
    );
  }
}