import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../bloc/insta_bloc_bloc.dart';
import '../../bloc/insta_bloc_event.dart';
import '../../bloc/insta_bloc_state.dart';
import '../components/explore_grid.dart';
import '../components/search_surface.dart';

class SearchViewScreen extends StatelessWidget {
  const SearchViewScreen({Key? key})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<InstaBlocBloc, InstaBlocState>(
      builder: (BuildContext context, InstaBlocState state) {
        return Scaffold(
          body: SingleChildScrollView(
            child: Column(
              children: <Widget>[
                Center(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: SearchSurface(
                      title: 'Explore',
                      subtitle: 'Trending creators and ideas',
                      queryText: state.searchQuery,
                      queryPlaceholder: 'Search creators,posts,or ideas',
                      onQueryChanged: (dynamic value) {
                        context.read<InstaBlocBloc>().add(SetSearchQueryInstaBlocEvent(q: value));
                      },
                      recentItems: state.recentSearches,
                      recentTitle: 'Recent searches',
                      onClearRecent: () {
                        context.read<InstaBlocBloc>().add(ClearRecentSearchesInstaBlocEvent());
                      },
                      onRecentTap: (dynamic value) {
                        context.read<InstaBlocBloc>().add(SetSearchQueryInstaBlocEvent(q: value));
                      },
                    ),
                  ),
                ),
                Center(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(0, 16, 12, 16),
                    child: ExploreGrid(
                      items: state.searchResults,
                      title: 'Discover',
                      subtitle: 'Visual ideas from your network',
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
